# Handoff notes for the engineering team

## How to run locally

```bash
git fetch origin
git clone https://github.com/StrategyandDesign/fathers-com-clean-pilot.git
cd fathers-com-clean-pilot
# default branch is review
npm install
cp .env.example .env.local
# Optional: fill Pilot URL/keys. If left blank, lib/supabase/env.ts uses Pilot.
npm run dev
```

Open http://localhost:3000 → `/login`.

Local `supabase start` is **not** the default path. `AGENTS.md` documents that applying the full `supabase/migrations/` directory (including pre-`20260817025510` files) fails on a blank database. Prefer the hosted Pilot project.

Signup needs a group `invite_code`. First Leader/admin: `supabase/sql/promote_pilot_role.sql` on Pilot, then sign out and in so the JWT picks up `app_metadata.role`.

## Required vs optional env

See `.env.example` and `handoff/02-INVENTORY.md` §4.

Minimum to click through as a father/leader: Pilot URL + publishable key (or the committed fallback) + an existing seat.

To send reminders or run `/api/cron/*`: `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`, plus Resend if you want email.

## Known gaps that need a human decision

1. **Whether `main` should stay Next.js on fathers-com-platform.vercel.app.** That is already the live fact as of 18 Aug 2026. This handoff does not change it.
2. **Whether to deploy current `clean-pilot` to fathers-com-pilot.vercel.app.** That host is stale.
3. **Whether to drop or adopt `platform_assessments*` on Pilot.** Present, unused by this branch.
4. **Whether to enable RLS on `internal.training_series_split_backup`.**
5. **Whether to add Next.js CI on `clean-pilot` PRs.** Current CI only runs the static checker on `main`.
6. **Whether leftover static HTML should ever be deleted**, and on which branch, without wiping `main`.
7. **Rotate pilot passwords and review hardcoded publishable keys** before any public launch.
8. **Draft PR #92** — do not merge in this package; decide separately.

## Suggested next steps (after this review, not in this PR)

1. Point a Vercel preview at this PR (base `clean-pilot`).
2. Invite reviewers to Supabase project **Pilot** only.
3. Walk `handoff/06-VERIFICATION-CHECKLIST.md`.
4. Keep `main` PRs (103–108, 93–99) off this review.
5. If you want one public pilot URL, redeploy `clean-pilot` to the **fathers-com-pilot** Vercel project only.

## What this environment could not fully exercise

This Cloud Agent had no `.env.local`, no browser login session, and no Vercel project admin.

Signed-out HTTP after cleanup (`npm run dev`, 18 Aug 2026):

| Path | Result |
|---|---|
| `/` | 307 → `/login` |
| `/login` | 200; copy “The Fathers Performance Platform” |
| `/father` `/manager` `/admin` | 307 → `/login?next=…` |
| `/privacy` | 200 |
| `/this-page-does-not-exist` | 404 |

Public hosts probed the same day (see `PILOT.md`). Father/manager/admin **authenticated** click-throughs were not run here. Unit tests, `tsc`, and lint were re-run after the UX port.
