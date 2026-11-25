# Massive Barbeque

Online store for **Massive Barbeque**: fire-grilled catfish, croaker, chicken and turkey with sides, delivered hot across Lagos. Built by [Kylva](https://kylva.com).

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the stack, data model, flows and security model.

## Requirements

- Node.js 22+
- A Neon project (Postgres + Object Storage bucket, `public_read`)
- Paystack account (test keys for development)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run db:migrate           # apply migrations to DATABASE_URL
npm run seed                 # catalogue, photos, combos, zones, WELCOME10, settings
npm run dev
```

Open http://localhost:3000. Sign up with the address in `ADMIN_EMAIL`, verify it, and you'll land on `/admin`.

Without `RESEND_API_KEY`, every email (verification links, receipts, reminders) is printed to the server console.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | Route type generation + `tsc` |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm test` | Vitest integration tests against the real DB (cleans up after itself) |
| `npm run test:e2e` | Playwright E2E, mobile first then desktop (needs `npm run build` first) |
| `npm run seed` | Idempotent catalogue seed (uploads photos to the bucket) |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations / Studio |

E2E starts two production servers (port 3000, and 3001 without Paystack keys) with a throwaway admin (`admin-e2e@example.com`), never your real `ADMIN_EMAIL`.

## Environment

Every variable is documented in [`.env.example`](./.env.example). Secrets live only in `.env.local` and Vercel.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL` | Same value: `https://massivebarbeque.com` in production, `http://localhost:3000` locally |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `DATABASE_URL` | Neon pooled connection string |
| `NEON_STORAGE_*`, `NEXT_PUBLIC_MEDIA_URL` | Bucket endpoint, credential (`token_id` / `s3_secret_access_key`), public base URL. Not `AWS_*` (Vercel reserves those) |
| `ADMIN_EMAIL` | The single admin account (must be verified) |
| `PAYSTACK_SECRET_KEY` | Test key locally, live key in production |
| `RESEND_API_KEY`, `EMAIL_FROM` | Verify `mail.massivebarbeque.com` in Resend first |
| `CRON_SECRET` | Vercel Cron sends it as a Bearer token |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys`; subject `mailto:you@…` |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Optional; load only after cookie consent |

## Order alerts (push)

1. Set the three VAPID variables and redeploy.
2. Open `/admin` → **Order alerts** → **Turn on**, then **Send test**.
   - Laptop: Chrome or Edge.
   - Android: Chrome.
   - iPhone: Safari → Share → **Add to Home Screen**, open from that icon, then turn alerts on.
   - Brave: Settings → Privacy → enable "Use Google services for push messaging".

## Go-live checklist

- [ ] Vercel env vars set (above). `NEXT_PUBLIC_APP_URL` = `BETTER_AUTH_URL` = `https://massivebarbeque.com`
- [ ] `npm run db:migrate` + `npm run seed` against production
- [ ] Sign up with `ADMIN_EMAIL`, verify, set the WhatsApp number in **Admin → Settings**
- [ ] Paystack live secret key; webhook URL in Paystack → Settings → API Keys & Webhooks: `https://massivebarbeque.com/api/paystack/webhook`
- [ ] Place a real ₦100 test order (hidden product), confirm it's paid + emailed, then refund it in Paystack
- [ ] Resend key + verified domain, `EMAIL_FROM`
- [ ] VAPID keys, then turn on Order alerts on your phone
- [ ] `CRON_SECRET` (cron runs daily at 08:17 UTC from `vercel.json`)
- [ ] GA4 / Clarity IDs (optional)

---

Made with love by [Kylva](https://kylva.com).
