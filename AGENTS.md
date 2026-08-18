# Agent notes

## Cursor Cloud specific instructions

The live product is the Next.js 15 App Router app in `app/`. `package.json` scripts (`npm run dev`, `npm run lint`, `npm run build`) are the source of truth for that app. The root `*.html` files and Python builders (`build_pages.py`, `README.md`, `.github/workflows/ci.yml`) are the previous static generation; they still pass CI but are not what `npm run dev` serves.

### Services

- **Next.js** (`npm run dev`) — required. Listens on http://localhost:3000. Throws at runtime if `NEXT_PUBLIC_SUPABASE_URL` and a publishable/anon key are missing (see `lib/supabase/env.ts` and `.env.example`).
- **Supabase** (Postgres + Auth + Storage) — required for login, signup, and every authenticated surface. Local stack: `supabase start` (needs Docker). Put keys from `supabase status` into `.env.local`.
- **Supabase Edge Functions, Stripe, Resend, VAPID, YouTube, Sentry** — optional. Local/pilot degrades without them.

### Fresh local database

`supabase/migrations/` includes historical files from before `20260817025510_pilot_core_schema.sql`. Those were applied by hand to production and assume tables that a brand-new local database does not have. `supabase start` that applies the full directory will fail on the first `ALTER TABLE assessments`.

For a local stack, apply only the clean-pilot era: `20260817025510` and later. Temporarily move older `supabase/migrations/*.sql` files aside; do not commit that move.

Signup requires a group `invite_code`. Seed a manager `profiles` row and a `groups` row after `supabase start`. Default local `supabase/config.toml` has `enable_confirmations = false`, so signup creates a session immediately.

### Lint / test / run

- Lint: `npm run lint`
- Unit tests: `npx tsx --test tests/*.test.ts` (no `package.json` test script; Node cannot resolve extensionless TS imports / `@/` aliases without `tsx`)
- Dev server: `npm run dev`
- Legacy CI gate: `python3 tools/check_release.py` (static HTML). Playwright `tests/e2e` also targets the static files, not Next.js.

Server-component chrome in `components/layout/role-shell.tsx` does not always hot-reload. Hard-refresh the browser, or restart `npm run dev` (clear `.next` if the old tree is still visible).
