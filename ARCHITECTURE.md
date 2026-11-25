# Massive Barbeque · Architecture

Production e-commerce for **Massive Barbeque** (fire-grilled catfish, croaker, chicken, turkey + sides, Lagos). Built by Kylva.

## Precedence

1. The owner's latest instruction in the session.
2. This file (approved architecture) and `CLAUDE.md`.
3. The Kylva master prompt (features, UX, SEO, testing).
4. `node_modules/next/dist/docs/` for framework APIs (this Next.js version differs from older training data).

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, `src/`), **Cache Components + Partial Prefetching**, Vercel (`fra1`) |
| UI | Tailwind v4 (Turbopack loader), shadcn (Base UI flavour: `render` prop, no `asChild`), `lucide-react`, Lenis |
| Data | Neon Postgres (`aws-eu-central-1`) + Drizzle, `neon-serverless` **WebSocket Pool** (real transactions, `FOR UPDATE`) |
| Auth | Better Auth: email/password + required verification, optional Google, DB rate limits, `nextCookies()` last |
| Images | Neon Object Storage, bucket `media` (public_read), server-side upload via sharp → WebP |
| Payments | **Paystack** (NGN: card, bank transfer, USSD) |
| Email | Resend REST (logs to console without a key) |
| Push | `web-push` (VAPID) admin new-order alerts via the site service worker |
| Validation / tests | Zod on every input · Vitest (real DB) · Playwright (mobile first) |

Single currency: **NGN only** (amounts stored in **kobo**). The currency toggle from the master prompt is omitted because the store sells only in Naira; the money layer is currency-aware so USD can be added later.

## Project structure

```
src/
  app/
    (store)/            storefront: home, menu, category, occasion, product, combos, cart, checkout, track, quiz, journal, info pages
    (auth)/             sign-in, sign-up, forgot, reset (shared AuthShell)
    account/            customer dashboard (instant = false)
    admin/              admin dashboard (instant = false, loading.tsx, requireAdmin everywhere)
    api/                auth handler, paystack webhook, cron, uploads, push, exports
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx
  components/ui/        shadcn primitives (brand-styled)
  components/           shared store/admin/account components
  db/                   schema.ts (+ auth-schema.ts generated), index.ts (Pool)
  lib/                  site.ts (client-safe), auth.ts, money.ts, order-status.ts, rate-limit.ts, storage.ts, email.ts, push.ts, paystack.ts
  server/               "server-only" queries + actions per domain
drizzle/                SQL migrations (drizzle-kit generate → migrate)
tests/ e2e/             Vitest integration · Playwright E2E
```

## Business adaptation (food, not cosmetics)

| Master prompt feature | Massive Barbeque version |
|---|---|
| Shop by concern/need | **Shop by occasion**: solo lunch, date night, family, party/office trays |
| Bundles | **Combos / platters** (e.g. Catfish + Plantain + Yam) with savings shown |
| Low-stock urgency | **Today's batch** count per variant (daily stock the grill can do) |
| Back-in-stock alerts | "**Back on the grill**" email when a sold-out item/size returns |
| Review attribute (skin type) | **Spice level** chosen by the reviewer (mild / hot / extra hot) |
| Quiz | **"Find your plate"**: group size, spice tolerance, fish vs meat, budget → recommendations + email capture; saved as a taste profile |
| Reorder reminders (days supply) | **Craving reminder** N days after delivery (per product `reorderDays`, e.g. 7) |
| Delivery estimates by zone | **Lagos delivery zones** (Island, Lekki–Ajah, Mainland, Ikeja…) with fee, minimum and ETA; free-delivery threshold |
| Variants | Sizes: Regular / Standard / Biggie (fish), Regular / Couple / Family (chicken, turkey) |
| Sticky add-to-bag + sides | "Complete your meal" side add-ons on product pages |

## Data model (Drizzle, snake_case columns)

Money = integer **kobo**. All timestamps `timestamptz`; displayed in `Africa/Lagos`.

**Auth (Better Auth):** `user`, `session`, `account`, `verification`, `rate_limit`.
**Admin** = verified session whose email equals `ADMIN_EMAIL` (no role column).

**Catalogue**
- `category` (id, slug unique, name, description, sort)
- `occasion` (id, slug, name, blurb, image)
- `product` (id, slug unique, name, description, category_id, status draft|active|archived, featured, spice_level, reorder_days, seo fields, created/updated)
- `product_variant` (id, product_id, name, sku unique, price_kobo **> 0**, compare_at_kobo, stock **≥ 0**, sort, active)
- `product_image` (id, product_id, url (must be our bucket), alt, sort)
- `product_occasion` (product_id, occasion_id)
- `combo` (id, slug, name, description, image, active) · `combo_item` (combo_id, variant_id, qty 1–20) · price derived with saving
- `product_side` (product_id, side_product_id): "Complete your meal"

**Commerce**
- `cart` (id, user_id null, token (cookie), email, last_active_at, reminders_sent 0–2) · `cart_item` (cart_id, variant_id | combo_id, qty 1–20)
- `shipping_zone` (id, name, areas text[], fee_kobo, free_over_kobo, eta_text, active)
- `order` (id, number **unguessable** e.g. `MB-7KQ2-9XHD`, user_id null, email, phone, name, address json, zone_id, method delivery|pickup, status, subtotal/discount/delivery/total kobo, currency, coupon_id, referral_code, payment_expires_at, paid_at, tracking, notes, created/updated)
- `order_item` (order_id, variant_id, combo_id, name/size snapshot, unit_kobo, qty)
- `order_event` (order_id, type, from_status, to_status, note, actor, created_at): timeline
- `payment` (id, order_id, provider 'paystack', reference unique, amount_kobo, currency, status, raw json, flagged reason, created/verified)
- Order status state machine in `lib/order-status.ts`: `pending_payment → confirmed → preparing → out_for_delivery (needs rider/tracking) → delivered`; `cancelled`, `expired`, `refunded` terminal.

**Growth**
- `coupon` (code unique, kind percent|fixed, value, min_subtotal, starts/ends, max_uses, once_per_email, influencer_name, user_id (personal), active) · `coupon_redemption` (coupon_id, email, order_id) unique(coupon_id,email)
- `referral` (code unique per user) · `referral_reward` (referrer, referee_email, order_id, reward coupon_id)
- `review` (product_id, user_id, order_id, rating 1–5, spice_level, title, body, status pending|approved|rejected) unique(user,product)
- `favourite` (user_id, product_id) · `address` (user_id, label, line, area, zone_id, phone, default)
- `subscriber` (email unique, source, marketing_opt_in, welcome_coupon_id) · `stock_alert` (email, variant_id) unique
- `quiz_result` (id, user_id null, email, answers json, recommendations, created_at)
- `push_subscription` (user_id, endpoint unique, keys, created_at)
- `store_settings` (singleton: whatsapp_number, banner_desktop, banner_mobile)
- `throttle` (key, count, window_start): app rate limits

DB check constraints: price > 0, stock ≥ 0, qty ranges, rating 1–5, reminders 0–2.

## Key flows

**Checkout (single transaction).** Zod-validate ids + qty only → load prices server-side → validate coupon/referral → compute subtotal, discount, delivery (zone) → **reserve stock** `UPDATE product_variant SET stock = stock - $qty WHERE id = $id AND stock >= $qty` in fixed id order (deadlock-safe) → insert order + items + `payment(pending)` + `order_event(placed)` → Paystack initialize with our reference → redirect. Payment window **60 min**; expiry returns stock (on checkout + daily cron).

**Payment settlement (idempotent).** Ignore redirect params. Verify **server-to-server** `GET /transaction/verify/:reference` → lock payment + order rows (`FOR UPDATE`) → mark paid only if status `success`, currency NGN and **amount exactly equal**; already-paid → no-op; mismatch/duplicate/late-after-expiry → flag + `order_event` + admin email (late: re-reserve stock if available, else flag for refund). Webhook: HMAC-SHA512 of raw body with `PAYSTACK_SECRET_KEY`, **constant-time compare**, then re-verify via API.

**Auth.** Verification required; password 8–128; sessions revoked on reset/change; `next` param must be a same-origin relative path. Admin lands on `/admin`, customers on `/account`.

**Images.** `requireAdmin` → sharp reads real pixels (JPG/PNG/WebP/AVIF, ≥ 400px, ≤ 4 MB) → strip EXIF/GPS → resize ≤ 1800px → WebP → random key `products/<uuid>.webp` → `Cache-Control: public, max-age=31536000, immutable`. Stored URLs must start with `NEXT_PUBLIC_MEDIA_URL`.

**Cron (Vercel, daily, `Authorization: Bearer CRON_SECRET`).** Expire unpaid orders (return stock), abandoned-bag emails (max 2), craving reminders, back-on-the-grill alerts, prune `throttle`.

## APIs (route handlers; everything else is server actions)

| Route | Purpose |
|---|---|
| `/api/auth/[...all]` | Better Auth |
| `POST /api/paystack/webhook` | Signature check → re-verify → settle |
| `GET /api/checkout/verify?reference=` | Return page verification (server-to-server) |
| `GET /api/cron/daily` | Daily jobs (bearer secret) |
| `POST /api/admin/upload` | Image upload (admin) |
| `POST/DELETE /api/admin/push` | Save/remove admin push subscription |
| `GET /api/admin/orders.csv`, `/api/admin/subscribers.csv` | CSV exports (formula-neutralised) |
| `GET /account/export` | Customer's own data (JSON) |

## Security model

- Backend enforces everything; client sends ids + quantities only. Prices, totals, discounts computed server-side.
- `requireAdmin()` in **every** admin page, action and route; non-admins/guests get **404**. `requireUser()` for account; all customer queries scoped by `session.user.id` in SQL (no IDOR). Guest order lookup: order number + email, rate limited.
- DB-backed rate limits: auth endpoints (Better Auth), cart, checkout, coupon quotes, order lookup, reviews, newsletter, quiz, uploads.
- Coupons once per email; referral first order only, never self; personal reward coupons bound to email.
- Escape LIKE wildcards; JSON-LD `<` escaped; CSV formula injection neutralised; `ON CONFLICT DO NOTHING` for concurrent inserts.
- Headers: CSP (`frame-ancestors 'none'`, `object-src 'none'`, allow Paystack/analytics/storage hosts), HSTS + `upgrade-insecure-requests` only on https, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, no `x-powered-by`.
- Push: only the admin saves subscriptions; endpoints must be https on FCM / Mozilla / Apple / Windows push hosts (SSRF guard); send only to the `ADMIN_EMAIL` user's devices; drop 404/410; SW opens same-origin URLs only.
- NDPA/GDPR: marketing opt-in, data export, account deletion with password (orders kept, `user_id` nulled).
- Secrets only in env vars; `.env*` ignored except `.env.example`.

## Rendering & caching

- Catalogue reads: `"use cache"` + `cacheTag('catalogue' | 'product:<id>' | 'settings')` + `cacheLife`; admin mutations call `updateTag`/`revalidateTag`.
- Anything reading cookies/headers/params/searchParams/session sits **inside `<Suspense>`**. `getSession()` awaits `connection()` first.
- `/admin` and `/account` export `instant = false`; admin has `loading.tsx`. `proxy.ts` only for optimistic redirects.

## SEO

Per-page metadata + canonical, OG/Twitter, generated OG image, `metadataBase`. JSON-LD: Organization (Restaurant/LocalBusiness), WebSite (SearchAction), Product (offers, availability, rating, reviews), BreadcrumbList, Article, FAQPage. `sitemap.ts`, `robots.ts` (disallow admin/account/checkout/cart/api). Real 404s via `notFound()` in `generateMetadata`. Lagos-focused copy ("BBQ fish delivery in Lagos", "grilled catfish Lekki"), 3+ journal articles.

## Tests

- **Vitest (real DB):** concurrent stock reservation, idempotent settlement, amount/currency mismatch, failed/expired/late/duplicate payments, coupon + referral rules, upload validation, push allowlist + admin-only delivery, running-low + review prompts scoping, CSV neutralising.
- **Playwright (mobile first, then desktop):** full purchase journey, account, admin, consent gating, 390px no horizontal scroll, security probes (webhook/cron 401, admin 404, open redirect).
