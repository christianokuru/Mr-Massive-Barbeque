# Massive Barbeque

Online store for **Massive Barbeque**, fire-grilled catfish, croaker, chicken and turkey with sides, delivered hot across Lagos. Built by [Kylva](https://kylva.com).

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the stack, data model, flows and security model.

## Requirements

- Node.js 22+
- A Neon project (Postgres + Object Storage)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values
npm run db:migrate           # apply migrations to DATABASE_URL
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | Route type generation + `tsc` |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm test` | Vitest integration tests (real DB) |
| `npm run test:e2e` | Playwright E2E (mobile + desktop) |
| `npm run db:generate` | Create a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio |

## Environment

Every variable is documented in [`.env.example`](./.env.example). Secrets live only in `.env.local` and Vercel.

## Go-live checklist

- [ ] Vercel env vars set (`NEXT_PUBLIC_APP_URL` = `BETTER_AUTH_URL` = `https://massivebarbeque.com`)
- [ ] `ADMIN_EMAIL` set and that account verified
- [ ] Paystack live keys + webhook URL `https://massivebarbeque.com/api/paystack/webhook`
- [ ] Resend key, `mail.massivebarbeque.com` domain verified, `EMAIL_FROM` set
- [ ] VAPID keys + `VAPID_SUBJECT`
- [ ] `CRON_SECRET` set (Vercel Cron)
- [ ] GA4 / Clarity IDs (optional)
- [ ] `npm run db:migrate` against production, seed catalogue

---

Made with love by [Kylva](https://kylva.com).
