# Audit findings log

Severity: **Blocker** (wrong host / wrong merge / data loss) · **High** · **Medium** · **Low**.  
Resolutions are on `cursor/clean-pilot-handoff-audit-7c78` unless marked left as-is.

---

## Blocker

### B1 — Reviewers can be sent to the wrong git line and the wrong host

**Evidence:** Open PRs 103–108 all have `base: main`. PR #92 targets `clean-pilot` but is draft, 532 files, `mergeable_state: dirty`.  
https://fathers-com-platform.vercel.app `/` → 307 `/login`, title “Fathers.com Pilot”, login sentence “The Fathers Performance Platform”, `/admin.html` → 404 (18 Aug 2026).  
https://fathers-com-pilot.vercel.app login sentence is still “Official Fathers.com training pilot.” while this branch’s `lib/i18n/messages/en.ts` `auth.pilotNotice` is “The Fathers Performance Platform”.

**Resolution:** Documented in `PILOT.md`, `README.md`, and `handoff/00-SUBMISSION-GUIDE.md`. This PR targets `clean-pilot` only.  
**Not fixed in code:** we cannot change Vercel project settings from this repo.

### B2 — Do not delete leftover static HTML on this branch

**Evidence:** `.vercelignore` excludes `*.html` and `assets/`. Those files are also the historical `main` static site. Removing them here would delete them if someone later merges this branch to `main`.

**Resolution:** Left in the tree. Called out as ignore-for-review. Stubs gitignored so they are not added.

---

## High

### H1 — README described the static site as the live app

**Evidence:** Previous `README.md` led with “Static HTML on Vercel” and `fathers-com-platform.vercel.app`.  
**Resolution:** Replaced with a clean-pilot Next.js README.

### H2 — Unused Next.js modules

**Evidence:** `rg` found exports only in:

- `components/assessments/assigned-list.tsx`
- `components/father/group-membership.tsx`
- `components/father/session-steps.tsx`
- `components/father/session-complete-mark.tsx`
- `lib/father/evaluate.ts`

**Resolution:** Deleted the unused father/session helpers and `evaluate.ts`. `assigned-list.tsx` was restored when completed Keystone results moved onto the Assessments tab.

### H3 — `.env.example` cron comment was wrong

**Evidence:** Comment said “every 15 minutes”. `vercel.json` schedules reminders `0 7 * * *` and streaks `0 6 * * *`.  
**Resolution:** Comment updated.

### H4 — Pilot DB has unused `platform_assessments*` tables

**Evidence:** `information_schema` on Pilot lists `platform_assessments` and five child tables. No `.from("platform_assessments")` in this branch. Migration applied as `20260818154055_platform_assessment_sandbox`. No matching file name in this branch.

**Resolution:** Left as-is. Documented. Do not drop from this PR (data/schema owned by Pilot; may belong to unsubmitted sandbox work).

### H5 — Hardcoded Pilot keys in `lib/supabase/env.ts`

**Evidence:** Publishable + anon JWT fallbacks committed. Comment says this avoided 500s after the clean-pilot ship when Vercel had no env.

**Resolution:** Left as-is for this line. Not a production pattern. Called out in the submission guide.

### H6 — Shared weak pilot passwords in `docs/CLEAN-PILOT-AUDITOR-LINK-REPORT.md`

**Evidence:** Password `12345` for four seats.  
**Resolution:** Left as-is (auditor walkthrough). Do not paste that password into the email to the PhD team unless they already have the auditor report. Prefer inviting them to Supabase and rotating.

---

## Medium

### M1 — `/manager/assessment-reviews/{key}` only exists for `keystone`

**Evidence:** `app/(manager)/manager/assessment-reviews/keystone/page.tsx` only. Email/notification builders can emit `/manager/assessment-reviews/{assessmentKey}`.  
**Resolution:** Left as-is. No custom platform-release keys are live (`platform_assessment_releases` rows = 0 on Pilot).

### M2 — `internal.training_series_split_backup` has RLS off

**Evidence:** Supabase advisor; table in `internal`, 41 rows.  
**Resolution:** Left as-is. Not queried by the app. Enabling RLS without policies can break maintenance. Human decision.

### M3 — CI still tests the static site, and only on `main`

**Evidence:** `.github/workflows/ci.yml` `on.push/pull_request.branches: [main]`, runs `tools/check_release.py`.  
**Resolution:** Left as-is. Changing CI on this branch does not change `main` until merge; adding Next CI is a human decision.

### M4 — `ARCHITECTURE.md` / `ROLES.md` / root docs still describe the static architecture

**Evidence:** `ARCHITECTURE.md` §1 still says generated static front-end.  
**Resolution:** Left as-is. Rewriting those doctrine docs is out of scope and they live on `main` too. Reviewers are told to use `PILOT.md` and `handoff/`.

### M5 — Optional integrations unset

**Evidence:** This environment has no Resend, VAPID, Sentry, YouTube API, or `CRON_SECRET`. Cron routes 401 without secret.  
**Resolution:** Left as-is. Documented.

### M6 — Father `/profile` vs `/assessments`

**Evidence:** Sidebar lists Assessments. Keystone still lives under `/father/profile/*`. Assessments page links into profile routes. Intentional, not a 404.  
**Resolution:** Left as-is.

---

## Low

### L1 — `/home`, `/manager/reviews`, `/manager/compare` are aliases

Intentional bookmarks. Left as-is.

### L2 — `.vercelignore` lists `next-scaffold/` which does not exist

Harmless. Left as-is.

### L3 — `evaluatePlaceholder` alias

Removed with `lib/father/evaluate.ts`.

### L4 — Untracked 261-byte HTML stubs on the agent disk

`veterans*.html`, `employers.html`, `gatherings.html`. Now gitignored. Not committed.
