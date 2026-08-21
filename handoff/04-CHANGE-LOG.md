# Change log

Internal branch: `cursor/clean-pilot-ux-refinements-7c78`  
Base: `origin/clean-pilot` @ `b950131`, plus the handoff cleanup  
Review copy: `https://github.com/StrategyandDesign/fathers-com-clean-pilot` (`review`)

No changes were made on `fathers-com-platform` `main` by this line.

## UX refinements ported onto this line (18 Aug 2026)

These were on `main`-based branches. They are now on the isolated review copy.

| Change | What you see |
|---|---|
| Training overview film | Super-admin can set a YouTube/Vimeo URL. Fathers open that film before sessions. Empty URL still goes straight to sessions. |
| Streak dialog | The green week square is gone. |
| Leader participants | Certificate of Completion sits under the roster, not above it. |
| Leader Home update | The preview stays blank until the Leader types. |
| Super-admin Assessments | Same desk list pattern as Trainings. |
| Father Assessments tab | Completed Keystone results show here, not only on Profile. |
| Check-in radios | Choosing an option no longer freezes the button on Saving. |

Schema: `trainings.overview_video_url` (migration `20260818230000_training_overview_video.sql`). Applied on Pilot.

## Deleted

| Path | Why |
|---|---|
| `components/assessments/assigned-list.tsx` | Deleted in the audit (zero importers then). Restored for Assessments-tab Keystone results. |
| `components/father/group-membership.tsx` | Zero importers; org mark is `OrganizationMark` in `role-shell.tsx` |
| `components/father/session-steps.tsx` | Zero importers; chrome is `session-header.tsx` |
| `components/father/session-complete-mark.tsx` | Zero importers |
| `lib/father/evaluate.ts` | Zero importers; scoring is `@/lib/profile/score` |

## Modified

| Path | Why |
|---|---|
| `README.md` | Next.js clean-pilot; isolated-repo note |
| `docs/engineering/PILOT.md` | Live-host table from 18 Aug 2026 probes |
| `.env.example` | Cron schedule matches `vercel.json` |
| `.gitignore` | Ignore local static-builder stub HTML |
| `.github/workflows/ci.yml` | Next.js typecheck / lint / unit tests (replaces static-site checker) |

## Added

| Path | Why |
|---|---|
| `handoff/00-SUBMISSION-GUIDE.md` | What to send the review team |
| `handoff/01-EXECUTIVE-SUMMARY.md` | State, cleanup, risks |
| `handoff/02-INVENTORY.md` | Routes, folders, schema, env |
| `handoff/03-AUDIT-FINDINGS.md` | Findings and resolutions |
| `handoff/04-CHANGE-LOG.md` | This file |
| `handoff/05-ENGINEERING-NOTES.md` | How to run, gaps |
| `handoff/06-VERIFICATION-CHECKLIST.md` | Confirm the cleanup |

## Repo organization (transfer)

Root markdown is now only `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `SHARED.md`, and `SUBMITS.md`. Old HTML and Python builders moved to `archive/static-site/`. Engineering runbooks moved to `docs/engineering/`. Discovery notes moved to `docs/product/`. Outdated architecture writeups moved to `docs/archive/`. Indexes live in `docs/README.md`.

## Not changed (on purpose)

- Auth / RLS
- `fathers-com-platform` `main`
