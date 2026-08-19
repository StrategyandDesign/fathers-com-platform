# How we work in this repo

Two jobs share one GitHub repo:

| Role | Owns | Does not have to read |
|---|---|---|
| Eric — hardening and backend | `app/`, `lib/`, `supabase/`, `tests/`, CI | `docs/product/`, `handoff/`, `archive/` |
| Micah — product discovery and agent work | `docs/product/`, `handoff/`, Shared marks | Must not dump essays into `app/` or `lib/` |

The live product is Next.js. Root HTML is archived. PRs stay small. Product notes and schema changes do not land in the same commit unless they must.

## Rules for the Next.js app

1. Edit `app/`, `components/`, and `lib/`. Do not edit `archive/static-site/*.html` to change the product.
2. Every database change is a new file in `supabase/migrations/`.
3. Secrets and money stay server-side (Route Handlers, Supabase Edge Functions). The browser never holds a service-role key.
4. New behavior gets a test under `tests/` when there is an existing pattern to extend.
5. Roles stay `father` / `manager` / `reviewer` / `admin`. Do not add a fifth product role without an explicit product decision.

## Local loop

The default tree in this repo is the app. No branch switch.

```bash
cp .env.example .env.local
npm install
npm run dev
```

http://127.0.0.1:3000/login — seats in `docs/engineering/PILOT.md`.

```bash
npm run lint
npx tsx --test tests/*.test.ts
npx tsc --noEmit
```

## Shared drops vs official submits

- This default tree is the moving line Micah and Eric share.
- **`shared/N`** tags in `SHARED.md` number those drops. They do not freeze a submit.
- **`submit/2`** is frozen. Do not fast-forward it.

## Pull requests

Work on a branch. Open a PR. Say what changed and what you verified. Merge when checks are green.

This isolated repo is the review line. It is not a cutover of `fathers.com` and it is not `fathers-com-platform` `main`.
