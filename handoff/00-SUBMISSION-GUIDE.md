# Handoff Submission Guide

**Audience:** you (the submitter)  
**Date:** 18 August 2026  
**Rule:** send only the isolated clean-pilot repository. Do not send `fathers-com-platform`. Do not send `main`.

This guide is written from a completed audit of `origin/clean-pilot` plus the cleanup on `cursor/clean-pilot-handoff-audit-7c78`. Probe evidence is from the same day.

GitHub collaborator access is **per repository**, not per branch. Anyone invited to `fathers-com-platform` can see `main` and every other branch. That is why the review copy lives in a **separate private repo**.

---

## 1. GitHub submission

### What to point the team at

| Point them here | Do not point them here |
|---|---|
| Isolated repo: https://github.com/StrategyandDesign/fathers-com-clean-pilot | https://github.com/StrategyandDesign/fathers-com-platform |
| Frozen submit branch `submit/2` (first official stamp, 19 Aug 2026) | `main` on `fathers-com-platform` |
| Later even submits `submit/4`, `submit/6`, … | Moving `review` unless you mean “current draft” |
| `SUBMITS.md`, `handoff/`, and the `Submit N` GitHub issues | Pull request **#109** on the old repo (internal only) |
| | Any `cursor/*-7c78` PR whose **base is `main`** (PRs 103–108) |
| | Draft PR **#92** (532 files, dirty) |
| | The `0b8c` stack (PRs 93–99) |

**Send one repository.** Do not also send the old repo “for context.” Do not ask them to review a pile of stacked PRs.

### How to invite (this repo only)

1. Open https://github.com/StrategyandDesign/fathers-com-clean-pilot
2. **Settings → Collaborators → Add people**
3. Invite each engineer as **Write** (or **Read** if they should not push)
4. Do **not** invite them to `fathers-com-platform`

You need their GitHub usernames to send the invite. Access is repo-wide on the isolated repo; that is intended, because that repo has only the clean-pilot line.

### Files to call out

**Cleaned on the submitted line**

- Deleted: `components/father/group-membership.tsx`, `components/father/session-steps.tsx`, `components/father/session-complete-mark.tsx`, `lib/father/evaluate.ts`
- Restored: `components/assessments/assigned-list.tsx` (needed again for completed Keystone on Assessments)
- Updated: `README.md`, `PILOT.md`, `.env.example`, `.gitignore`
- Added: `handoff/*`
- Ported UX: overview film, streak dialog, certificate placement, quiet Home update, Super-admin Assessments desk, Assessments-tab Keystone results, check-in save freeze fix

**Archived so the root looks like the Next.js app**

- Old `*.html` and `build_*.py` now live in `archive/static-site/`
- Those are leftover static-site source. They are not what `npm run dev` serves.

---

## 2. Supabase submission

### Correct project

| Field | Value |
|---|---|
| Name | **Pilot** |
| Project ref | `koeplcybddrvbliuepsy` |
| Dashboard | https://supabase.com/dashboard/project/koeplcybddrvbliuepsy |
| API host | https://koeplcybddrvbliuepsy.supabase.co |
| Region | us-east-2 |
| Status (18 Aug 2026) | `ACTIVE_HEALTHY` |

### Wrong project (do not share as the review DB)

| Name | Ref | Status |
|---|---|---|
| fathers-com-platform | `kemqpiboqeqhbuuldmls` | **INACTIVE** |
| ReqPub Project | `mqppdbiimvdgjsjirduw` | Unrelated |

Say this in the email: “The Next.js clean-pilot app uses only the Supabase project named **Pilot** (`koeplcybddrvbliuepsy`). The project named `fathers-com-platform` is inactive and is not this review.”

### How to grant access

1. Supabase Dashboard → organization that owns **Pilot**.
2. **Organization → Team** → invite each engineer by email as `Developer` (or `Read-only` if they only need to inspect).
3. Also share the project ref and dashboard URL above.
4. Do **not** send the service-role key in email. If they need to run cron locally, they create their own secrets in a personal `.env.local`.
5. Pilot publishable/anon keys are already in the repo as a fallback (`lib/supabase/env.ts`). Treat them as public, same class as a shipped anon key. Rotate later if the team asks.

Pilot test seats (already documented in `docs/CLEAN-PILOT-AUDITOR-LINK-REPORT.md`; weak by design):

| Email | Role |
|---|---|
| `father@nwa` | father (Returning Home NWA) |
| `manager@nwa` | manager / Leader (Brenda) |
| `reviewer@nwa` | reviewer, scoped to NWA |
| `father1@il` | father (Unit 8200) |
| `manager@il` | manager (shown as Leader) |
| `reviewer@il` | reviewer |
| `admin@fathers` | admin |

Shared pilot password: `12345`. Same seats work on localhost and Vercel (they share the Pilot database).

Tell the team these are **pilot-only** and must not be reused on any production project.

### Schema in scope

Public tables the Next.js app actually reads/writes (RLS on):

`profiles`, `groups`, `group_members`, `trainings`, `sessions`, `session_progress`, `father_profiles`, `father_profile_drafts`, `training_assignments`, `certificates`, `notification_preferences`, `reminder_preferences`, `custom_assessments`, `custom_assessment_questions`, `custom_assessment_assignments`, `custom_assessment_answers`, `platform_assessment_releases`, `organization_assessment_reviews`, `organization_assessment_availability`, `organization_training_reviews`, `manager_notifications`, `manager_nudges`, `manager_participant_notes`, `organization_photos`, `organization_cohort_notes`, `organization_cohort_note_dismissals`, `support_reports`, `training_requests`, `training_sources`, `training_intakes`, `push_subscriptions`, `notification_outbox`, `notification_deliveries`, `action_commitments`, `father_streaks`, `streak_week_ledger`, `father_streak_notices`

Storage buckets: `certificates`, `org-photos`, `support-screenshots`, `avatars` (read-only from the app).

**On Pilot today, not queried by this branch:** `platform_assessments`, `platform_assessment_domains`, `platform_assessment_items`, `platform_assessment_bands`, `platform_assessment_attempts`, `platform_assessment_responses` (applied as `20260818154055_platform_assessment_sandbox`). `internal.training_series_split_backup` is a migration artifact; RLS is off; `internal` is not the app’s API schema.

Edge functions on Pilot: **none deployed**. Repo `supabase/functions/*` are leftover from the static site and are out of scope.

---

## 3. Vercel submission

### There is no current “definitive public preview” of this SHA

Probed 18 August 2026:

| URL | What it is | Share as the review app? |
|---|---|---|
| https://fathers-com-pilot.vercel.app | Next.js, **old** build. Title “Fathers.com Pilot”. Login copy: “Official Fathers.com training pilot.” | **No** |
| https://fathers-com-platform.vercel.app | Next.js from **`main`**. Login copy: “The Fathers Performance Platform”. `/admin.html` → 404. | **No** |

Both hosts 307 `/` and `/father` to `/login` when signed out. Both are Next.js. Neither is this isolated handoff.

### What to share instead

1. Tell the team to clone the isolated repo and run `npm run dev` (`docs/engineering/PILOT.md`).
2. If they create their own Vercel project from **this** repo, that preview is in scope. A preview attached to `fathers-com-platform` is not.
3. Write this sentence in the email: “Do not use fathers-com-platform.vercel.app or fathers-com-pilot.vercel.app to judge this handoff. The first is `main` on the old repo. The second is a stale Pilot deploy.”

### Env / project settings to mention

Required for a faithful preview:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://koeplcybddrvbliuepsy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon key) for **Pilot**
- `NEXT_PUBLIC_SITE_URL` = the preview URL

Optional (app degrades without them): `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `YOUTUBE_API_KEY`, VAPID keys, Sentry DSN.

If the preview project has no Supabase env, this line falls back to the hardcoded Pilot keys in `lib/supabase/env.ts`. That is intentional for this line. It is **not** a production pattern.

---

## 4. Supporting documents (order)

Point the team at these in the isolated repo, in this order:

1. `handoff/00-SUBMISSION-GUIDE.md` — this file
2. `handoff/01-EXECUTIVE-SUMMARY.md`
3. `handoff/02-INVENTORY.md`
4. `handoff/03-AUDIT-FINDINGS.md`
5. `handoff/04-CHANGE-LOG.md`
6. `handoff/05-ENGINEERING-NOTES.md`
7. `handoff/06-VERIFICATION-CHECKLIST.md`
8. `docs/engineering/PILOT.md` — how to create seats and run locally

Do not send `README.md` from `fathers-com-platform` `main`. Do not send `ARCHITECTURE.md` as the system description of this app (it still describes the static site).

---

## 5. Recommended message to the technical team

```text
Subject: Fathers.com clean-pilot — Submit 2 (19 Aug 2026)

Repo:
https://github.com/StrategyandDesign/fathers-com-clean-pilot

Official copy (frozen):
git clone https://github.com/StrategyandDesign/fathers-com-clean-pilot.git
cd fathers-com-clean-pilot
git checkout submit/2

Record: SUBMITS.md and the GitHub issue titled Submit 2.

Start with handoff/00-SUBMISSION-GUIDE.md

This is the Next.js clean-pilot app for hardening.
It is not production. Do not use fathers-com-platform.vercel.app.

Data is the Supabase project named Pilot (ref koeplcybddrvbliuepsy).
The Supabase project named fathers-com-platform is inactive and is
not this review.

What is being submitted
- The Next.js 15 app in app/
- The handoff/ documents
- Access to the Pilot Supabase project (invite to follow)

What is not being submitted
- The fathers-com-platform repository (that contains main)
- Email, push, Sentry, and cron (optional; degrade when unset)
- A claim that either public Vercel URL is this code

Preferred review order
1) handoff/00-SUBMISSION-GUIDE.md
2) handoff/01-EXECUTIVE-SUMMARY.md
3) handoff/02-INVENTORY.md and handoff/03-AUDIT-FINDINGS.md
4) Run locally (`docs/engineering/PILOT.md`) — not fathers-com-pilot.vercel.app (stale)
   and not fathers-com-platform.vercel.app (old-repo main)

This app is a signed-in pilot. It is not live on fathers.com.
```

---

## 6. Final checklist before you hit send

- [ ] The GitHub link is **https://github.com/StrategyandDesign/fathers-com-clean-pilot**
- [ ] You invited them to **that** repo only, not `fathers-com-platform`
- [ ] You are not including PRs 103–109, 93–99, or 92
- [ ] The Vercel link, if any, is a preview **of the isolated repo**, not `fathers-com-platform.vercel.app` and not `fathers-com-pilot.vercel.app`
- [ ] The Supabase link is project **Pilot** / `koeplcybddrvbliuepsy`, not `kemqpiboqeqhbuuldmls`
- [ ] The message says this is **not production**
- [ ] `handoff/` is in the isolated repo
- [ ] You have not attached service-role keys
