# Executive summary

**Line under review:** isolated repo `fathers-com-clean-pilot` (`review`) — `clean-pilot` `b950131`, handoff cleanup, then the seven UX refinements below  
**Date:** 18 August 2026  
**Verdict:** The Next.js clean-pilot app is a coherent signed-in product. It is **not** production-ready. Do not treat `fathers-com-platform` or its `main` branch as this review.

## Current state

The live product on this line is a Next.js 15 App Router app (`app/`). Four roles: father, manager (chrome: Leader), reviewer, admin. Core loop is Film → Check-in → Action. Auth is email/password via Supabase. RLS is on every public table the app uses.

Two public Vercel hosts both serve Next.js today (probed 18 Aug 2026):

- `fathers-com-pilot.vercel.app` — stale clean-pilot deploy (old login sentence).
- `fathers-com-platform.vercel.app` — `main` (current login sentence). Static HTML paths 404.

Both signed-out gated paths 307 to `/login`. The old static HTML site is **not** what those hosts serve anymore. Reviewers must clone `fathers-com-clean-pilot` and run it locally (or a Vercel preview of **that** repo), not those two URLs.

Data is Pilot Supabase `koeplcybddrvbliuepsy`. The project named `fathers-com-platform` is **INACTIVE**.

## What was cleaned on this line

- Five unused Next.js modules with zero remaining importers.
- README rewritten so this branch is not described as the static site.
- PILOT.md now records the live-host facts above.
- `.env.example` cron comment matches `vercel.json` (daily, not every 15 minutes).
- Local `veterans*.html` / `employers.html` / `gatherings.html` stubs gitignored.

## UX refinements now on this line

Ported from later `main`-based work so the review copy matches the product polish:

- Training overview film (YouTube/Vimeo) as the training front door
- Green week square removed from the streak dialog
- Certificate of Completion under the participant list
- Home update preview blank until the Leader types
- Super-admin Assessments uses the same desk list as Trainings
- Completed Keystone results on the Assessments tab
- Check-in no longer freezes on Saving after a radio choice

## Remaining risks

| Risk | Why it is still there |
|---|---|
| Internal `clean-pilot` branch still contains static HTML, Python builders, `assets/` | Deleting them there would make a later merge to `fathers-com-platform` `main` wipe that history. The isolated review repo omits them. |
| Hardcoded Pilot keys in `lib/supabase/env.ts` | Stops Vercel 500s when env is empty. Public-class keys. Not a production secret pattern. |
| Weak shared pilot passwords | Documented for auditor walkthrough. Rotate before any public launch. |
| Pilot DB has `platform_assessments*` not used by this branch | Applied from a later sandbox migration. App does not query them. |
| No email / push / cron unless secrets are set | Intentional degrade. Reminders will not send. |
| Draft PR #92 is large and dirty | Not in this package. |
| Isolated-repo CI is Next.js only | Replaced the leftover static-site checker so `main` on `fathers-com-clean-pilot` runs typecheck, lint, and unit tests. |

## Explicitly not production-ready

- No `fathers.com` DNS.
- No separate production database for this app.
- Legal pages are counsel templates.
- Keystone scoring is the interim model (`lib/profile/models/interim.ts`).
- Certificates are Leader-issued PDFs, not a public verify site.
- Optional integrations (Resend, VAPID, Sentry, YouTube Data API) are unset in this environment.

A PhD reviewer can read `app/`, `lib/`, `components/`, `handoff/`, and `docs/engineering/PILOT.md` without first deleting AI scaffolding from the Next.js tree. They should ignore `archive/static-site/` and `assets/` for behavior.
