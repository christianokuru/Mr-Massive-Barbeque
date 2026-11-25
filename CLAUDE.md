@AGENTS.md

# Massive Barbeque · working rules

Read `HANDOVER.md` first (current state, decisions, to-dos), then `ARCHITECTURE.md` (the approved architecture).

## Precedence
1. Owner's latest instruction. 2. `ARCHITECTURE.md` + this file. 3. Kylva master prompt. 4. `node_modules/next/dist/docs/` for framework APIs.

## Must
- Money in **kobo** integers; NGN only. Dates shown in `Africa/Lagos`.
- Server computes all prices; client sends ids + qty. Zod on every input.
- `requireAdmin()` in every admin page/action/route (404 otherwise). Customer queries scoped by session user in SQL.
- `"use cache"` + `cacheTag` for catalogue; dynamic reads inside `<Suspense>`; `getSession()` awaits `connection()`.
- shadcn = Base UI (`render` prop, no `asChild`). Buttons are pills. Use `useConfirm()`, never `window.confirm()`.
- No stray exports from `"use server"` files. `server-only` on server modules.
- Before every push: `npm run typecheck && npm run lint && npm run build` pass.
- Tests and local work use the Neon **dev** branch only (`TEST_DATABASE_URL`, enforced by `test-db.ts`). Never run tests or scripts against the live **main** branch.
- Never `--legacy-peer-deps`. Never commit `.env*` (except `.env.example`) or personal emails.
- Push to `main` after each phase. Remind the owner to `git checkout -- package-lock.json && git pull && npm install` when `package.json` changes.
