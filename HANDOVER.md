# Massive Barbeque · Handover

Read this first if you are a new Claude session, a new Claude account or a new developer.
It tells you where the project stands, why things are the way they are, and what's left to do.

Read in this order:
1. **HANDOVER.md** (this file): state, decisions, to-dos
2. **ARCHITECTURE.md**: the approved architecture (data model, flows, APIs, security, caching, tests)
3. **CLAUDE.md**: the working rules Claude must follow (checks before push, test database, money in kobo…)
4. **Admin → Guide** on the live site: how the owner runs the shop day to day

Owner's preferences: short answers in plain English, no jargon. If the owner says **"don't code"**, explain and recommend only.

---

## 1. What this is

An online shop for **Massive Barbeque**, a fire-grilled BBQ business in Lagos (chicken, turkey, catfish, croaker, sides).
Customers order and pay online (Paystack) for delivery across Lagos or pickup in Ayobo. The owner runs everything from `/admin`.

- Domain: **www.massivebarbeque.com** (bare domain redirects to www in Vercel, never in code: doing both loops)
- Repo: `christianokuru/mr-massive-barbeque`, branch `main` (also mirrored to `quantoxt/nice-carson-tq6ahl`)
- Built by Kylva

---

## 2. Current state (as of 25 Nov 2026)

- **The live site is a demo.** Vercel's `DATABASE_URL` points at the Neon **dev** branch on purpose. No real customers yet.
- **The main (live) database is clean and ready**: no accounts, no orders; menu (10 products), 5 delivery zones, `WELCOME10` and settings kept.
- The **dev** database still has the old test accounts and 4 old orders (a copy of main from before it was cleared).
- All features are built and tested (27 unit tests, 36 browser tests).

### Neon
- Project `massive-barbeque-store` (`restless-unit-16240913`, eu-central-1)
- Branch **main** = live (`br-wild-mountain-bgtcw9fk`); branch **dev** = demo + all tests (`br-shy-cherry-bgkxds0e`)
- Neon also hosts image storage (`NEXT_PUBLIC_MEDIA_URL`), which is shared by both branches.

---

## 3. Before going live (to-do)

1. **Apply the newest database change to main.** The `order_push` table (customer phone alerts) exists on dev only. Run once:
   `DATABASE_URL="<main connection string>" npx drizzle-kit migrate`
2. **Point Vercel at main:** set `DATABASE_URL` to the **main** branch (pooled) string, then redeploy.
3. **Sign up the admin again** on the live site with the `ADMIN_EMAIL` address (main has no accounts).
4. **Paystack:** use **live** keys and set the webhook to `https://www.massivebarbeque.com/api/paystack/webhook`.
5. **App URLs in Vercel:** `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` = `https://www.massivebarbeque.com`.
6. **VAPID keys** (phone alerts): add all three to Vercel. The private key was shared in a chat, so generate a new pair before launch (`npx web-push generate-vapid-keys`).
7. **WhatsApp number:** set it in Admin → Settings (it was reset to empty).
8. **Hosting:** the client can't pay for hosting. Vercel Hobby doesn't allow commercial use. See decision D7 below.

---

## 4. Architecture at three levels

Software architecture can be planned at three levels. Each has its own patterns. This is how this project is built at each level:

### Level 1: System architecture (the big parts and how they talk)
**Patterns used:** monolith (one Next.js app), serverless hosting, event-driven payments (webhook), CDN caching, n-tier.

```
Customer / Admin browser (+ service worker for alerts)
        │
        ▼
Vercel (Next.js 16 app, region fra1, daily cron)
   ├── Neon Postgres (main = live, dev = demo/tests)
   ├── Neon object storage (product photos)
   ├── Paystack (payments + webhook back to us)
   ├── Resend (emails)
   ├── Web Push services (Google / Apple / Mozilla) for phone alerts
   └── Analytics (GA4, Clarity, Meta Pixel), only after cookie consent
```

### Level 2: Application architecture (how the app is organised inside)
**Patterns used:** layered architecture, server-side rendering with caching, a light CQRS split, a state machine for orders.

- **Layers:** pages and components (`src/app`, `src/components`) → server actions and API routes (`src/app/actions`, `src/app/api`) → business logic (`src/server`) → database (`src/db`).
- **The server owns all money.** The browser only sends product ids and quantities. Prices, discounts, delivery and totals are worked out on the server, in kobo (integer).
- **Reads vs writes:** the catalogue is cached (`"use cache"` + tags, refreshed when admin edits); orders and payments are live, locked, transactional writes.
- **Order state machine:** `pending_payment → confirmed → preparing → out_for_delivery → delivered` (+ cancelled / expired / refunded). Allowed moves are in `src/lib/order-status.ts`.
- **Payments are idempotent:** our own reference, server-to-server verification, exact amount + currency check, row locks.
- **Live order updates:** order pages poll a tiny status endpoint (10s when waiting, 30s while grilling, stop when done or hidden).

### Level 3: Code architecture (folders, files, patterns)
**Patterns used:** folders by type, a repository-style server layer, adapters for outside services, a singleton DB connection, Zod validation at every input.

| Folder | What lives there |
|---|---|
| `src/app/(store)` | Customer pages (menu, cart, checkout, track, account) |
| `src/app/admin` | Admin pages (all call `requireAdmin()`) |
| `src/app/api` | Route handlers: auth, Paystack webhook, cron, uploads, CSV, order status, alerts |
| `src/app/actions` | Server actions (forms and buttons) |
| `src/server` | Business logic + all DB queries (orders, pricing, payments, emails, push, cron) |
| `src/db` | Drizzle schema + connection; migrations in `drizzle/` |
| `src/lib` | Shared helpers safe for browser + server (money, formats, validation, order status) |
| `src/components` | UI (shadcn on Base UI; buttons are pills) |
| `tests` / `e2e` | Vitest (real dev DB) / Playwright (phone + desktop) |

### Planning words (so any Claude knows what you mean)
- **Architectural patterns** = system and application level. **Design patterns** = code level.
- **Tech spec** / **Software Architecture Document**: the written plan. Here: `ARCHITECTURE.md`.
- **ADR (Architecture Decision Record)**: one short note per big decision. Here: section 5 below.
- **C4 diagrams**: the standard way to draw context → containers → components → code.
- Habit for new projects: write `ARCHITECTURE.md` and `CLAUDE.md` **before** any code, approve them, then build.

---

## 5. Key decisions (ADRs)

| # | Decision | Why | Not chosen (and why) |
|---|---|---|---|
| D1 | Next.js 16 (App Router, cache components) on Vercel | Fast pages, server-only money logic, one codebase | n/a |
| D2 | Neon Postgres + Drizzle | Serverless Postgres, branches (main/dev), free tier | n/a |
| D3 | Better Auth, email verification required, single admin by `ADMIN_EMAIL` | Simple, no roles table needed for one owner | n/a |
| D4 | Paystack, verify server-to-server, ignore redirect params | Nigerian payments; the redirect can't be trusted | Trusting the callback |
| D5 | Stock reserved at checkout, returned on expiry (60 min) | Never oversell the last fish | n/a |
| D6 | All tests on the Neon **dev** branch (`test-db.ts` refuses otherwise) | Tests once changed live settings by accident | Testing on live |
| D7 | Hosting: stay on Vercel for the demo; for a ₦0 live launch use **Oracle Cloud Always Free VM + Cloudflare free CDN** | Client can't pay; every feature works there and it never pauses | Cloudflare Workers free (measured 5.9 MB vs 3 MB limit; cache components not fully supported), Netlify free (site pauses when 300 credits run out), Vercel Hobby (no commercial use) |
| D8 | Live order status by polling (adaptive 10s/30s), not WebSockets | Light, reliable on serverless; seconds don't matter for food | WebSockets/SSE (needs extra service) |
| D9 | Customer phone alerts per order (`order_push`), guests included | No account needed; auto-removed when the order ends | n/a |
| D10 | Emails via Resend with a branded table layout (11px body) | Works in Gmail/Outlook; warm tone requested by owner | n/a |
| D11 | Link preview card drawn from local JPG/PNG/TTF files | The image renderer can't read WebP | Remote WebP hero |

---

## 6. Settings (names only, never commit values)

Set in Vercel → Settings → Environment Variables, and in `.env.local` for local work. Full notes in `.env.example`.

- **App:** `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`
- **Database:** `DATABASE_URL` (Vercel: main when live; local: dev), `TEST_DATABASE_URL` (always dev), `LIVE_DATABASE_URL` (local only, for migrations)
- **Images:** `NEON_STORAGE_ENDPOINT`, `NEON_STORAGE_REGION`, `NEON_STORAGE_BUCKET`, `NEON_STORAGE_ACCESS_KEY_ID`, `NEON_STORAGE_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_MEDIA_URL`
- **Admin + cron:** `ADMIN_EMAIL`, `CRON_SECRET`
- **Payments:** `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- **Email:** `RESEND_API_KEY`, `EMAIL_FROM` (domain `mail.massivebarbeque.com` verified in Resend)
- **Google sign-in (optional):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Phone alerts:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` + an email)
- **Analytics (optional):** `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_META_PIXEL_ID`

---

## 7. How to work on it

```bash
npm install
npm run dev                 # local, uses the dev database
npm test                    # unit tests (dev database only)
npm run test:e2e            # browser tests (builds must be fresh: npm run build first)
npm run typecheck && npm run lint && npm run build   # must pass before every push
```

- Schema change: edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate` (dev) → later run against main with `LIVE_DATABASE_URL` when going live.
- After a push that changes `package.json`, the owner runs: `git checkout -- package-lock.json && git pull && npm install`.
- Never use `--legacy-peer-deps`. Never commit `.env*` (except `.env.example`) or personal emails.

---

## 8. Features at a glance

**Store:** menu with sizes and combos, search and filters, food quiz, bag (fast repeat taps can't add twice), checkout (delivery zones or pickup), coupons and referrals, Paystack, order tracking with **live updates**, **phone alerts**, reviews from real buyers, favourites, saved addresses, rewards page, data export and account deletion, cookie consent, offline page, installable app (PWA), SEO (structured data, sitemap, link preview card).

**Admin:** dashboard with sales chart and **phone alerts**, orders (search by phone, CSV, status changes with rider details), products (image upload), combos, categories, coupons, shipping zones, customers, **Regulars** (repeat customers and what they always order), abandoned bags, subscribers, reviews moderation, settings (WhatsApp, banners), and a plain-English **Guide**.

**Automatic:** daily job (expire unpaid orders and return stock, abandoned-bag emails, "craving again?" reminders, back-in-stock alerts, clean-ups); branded emails for every step.
