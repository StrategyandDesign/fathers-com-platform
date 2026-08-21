# Agent notes

## Cursor Cloud specific instructions

The live product is the Next.js 15 App Router app in `app/`. `package.json` scripts (`npm run dev`, `npm run lint`, `npm run build`) are the source of truth.

`archive/static-site/*.html` and `archive/static-site/build_*.py` are the previous static generation. They are not what `npm run dev` serves.

Do not add new markdown to the repo root. Product notes go in `docs/product/`. Engineering runbooks go in `docs/engineering/`. Keep `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `SHARED.md`, and `SUBMITS.md` as the only root docs.

### Services

- **Next.js** (`npm run dev`) — required. http://localhost:3000. If env keys are missing, Pilot fallback is in `lib/supabase/env.ts`.
- **Supabase** — required for login and authenticated surfaces.
- Edge Functions, Stripe, Resend, VAPID, YouTube, Sentry — optional. Local/pilot degrades without them.

### Fresh local database

`supabase/migrations/` includes historical files from before `20260817025510_pilot_core_schema.sql`. A brand-new `supabase start` that applies the full directory can fail on early `ALTER TABLE` files.

For a local stack, apply only the clean-pilot era: `20260817025510` and later. See `docs/engineering/PILOT.md`.

### Lint / test / run

- Lint: `npm run lint`
- Unit tests: `npx tsx --test tests/*.test.ts`
- Dev server: `npm run dev`

Server-component chrome in `components/layout/role-shell.tsx` does not always hot-reload. Hard-refresh, or restart `npm run dev`.
