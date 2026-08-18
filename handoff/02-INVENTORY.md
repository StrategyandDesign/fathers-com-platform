# Inventory and architecture

Branch inventoried: `origin/clean-pilot` @ `b950131`, handoff cleanup, then the UX refinement port.  
Auth model: middleware `roleForPath` + layout `requireRole` + RLS `profiles.role` / `current_user_role()`. JWT `app_metadata.role` is for routing; `profiles.role` is preferred on the server (`resolveProfileRole`).

---

## 1. Route map

Middleware (`middleware.ts` → `lib/supabase/middleware.ts`): signed-out users hitting a role prefix go to `/login?next=…`. Wrong role goes to `ROLE_HOME[role]`. Logged-in users on `/login` or `/signup` go to role home.

Status key: **Working** = page exists, gated, linked or is an intentional deep link. **Alias** = redirect only. **Deep** = reachable, not in the sidebar.

### Public — no role

| Path | File | Status | Auth |
|---|---|---|---|
| `/` | `app/page.tsx` | Working | Redirect to role home or `/login` |
| `/login` | `app/(auth)/login/page.tsx` | Working | Public |
| `/signup` | `app/(auth)/signup/page.tsx` | Working | Public; fathers + invite code |
| `/privacy` | `app/(legal)/privacy/page.tsx` | Working | Public |
| `/terms` | `app/(legal)/terms/page.tsx` | Working | Public |

### Father — middleware + `requireRole("father")` + onboarding gate

| Path | Status | Notes |
|---|---|---|
| `/father` | Working | Home |
| `/father/trainings` | Working | Sidebar |
| `/father/trainings/[trainingId]` | Deep | Overview film door, then sessions |
| `/father/assessments` | Working | Sidebar |
| `/father/certificates` | Working | Sidebar |
| `/father/account` | Deep | Avatar |
| `/father/help` | Deep | Account footer |
| `/father/profile` | Deep | Keystone hub; Assessments links here |
| `/father/profile/take` | Deep | |
| `/father/profile/results` | Deep | |
| `/father/assessments/[assignmentId]` | Deep | Custom assessment |
| `/father/sessions/[sessionId]`{,/checkin,/action,/done} | Deep | Film → Check-in → Action |
| `/father/start` and `/father/start/*` | Working | First-run; `/start` and `/start/session` are aliases |
| `/home` | Alias | → `/father` |

### Manager (Leader)

| Path | Status | Notes |
|---|---|---|
| `/manager` | Working | Sidebar |
| `/manager/trainings` | Working | Sidebar |
| `/manager/participants` | Working | Sidebar |
| `/manager/impact` | Working | Sidebar |
| `/manager/assessments` | Working | Sidebar |
| `/manager/reports` | Working | Sidebar |
| `/manager/account/photos` | Working | Sidebar |
| `/manager/account` | Deep | Avatar |
| `/manager/help` | Deep | |
| `/manager/request` | Deep | New training request |
| `/manager/reviews` | Alias | → `/manager/trainings` |
| `/manager/reviews/[trainingId]` | Deep | Accept/decline a release |
| `/manager/compare` | Alias | → `/manager/impact?tab=compare` |
| `/manager/participants/bulk` | Deep | |
| `/manager/participants/[id]` | Deep | |
| `/manager/participants/[id]/certificates/[trainingId]` | Deep | |
| `/manager/assessments/new`, `/[id]`, `/[id]/responses/[fatherId]`, `/keystone` | Deep | |
| `/manager/assessment-reviews/keystone` | Deep | Only `keystone` has a page |
| `/manager/practice` and practice session/profile/assessment paths | Deep | Leader walk; not in sidebar |

### Reviewer

| Path | Status |
|---|---|
| `/reviewer` | Working |
| `/reviewer/summary` | Working |
| `/reviewer/account` | Working (also in nav) |
| `/reviewer/help` | Deep |

### Admin (Super-admin)

| Path | Status |
|---|---|
| `/admin` | Working |
| `/admin/gathering` | Working |
| `/admin/organizations`, `/new`, `/[id]` | Working / Deep |
| `/admin/trainings`, `/new`, `/[id]`, `/[id]/stage`, `/[id]/stage/overview`, stage session steps | Working / Deep |
| `/admin/trainings/sources`, `/new`, `/[id]` | Deep from trainings |
| `/admin/trainings/intakes/[id]` | Deep |
| `/admin/assessments`, `/assessments/keystone` | Working / Deep |
| `/admin/users`, `/[id]` | Working / Deep |
| `/admin/support`, `/[id]`, `/support/requests`, `/requests/[id]` | Working / Deep |
| `/admin/account` | Deep (avatar; not in sidebar) |

### API

| Path | Auth |
|---|---|
| `POST /api/profile/evaluate` | father or manager |
| `POST /api/push/subscribe` | father |
| `GET /api/manager/impact/export` | manager |
| `GET /api/manager/reports/export` | manager |
| `GET /api/reviewer/insights/export` | reviewer |
| `GET /api/reviewer/summary/export` | reviewer |
| `GET\|POST /api/cron/reminders` | `CRON_SECRET` |
| `GET\|POST /api/cron/streaks` | `CRON_SECRET` |
| `POST /api/session-progress/position` | father + same-origin |
| `GET /api/certificates/[id]/download` | any signed-in; file load is RLS-gated |

---

## 2. Folder purposes

| Path | Role |
|---|---|
| `app/` | Next.js routes |
| `components/` | UI by domain |
| `lib/` | Server logic, auth, i18n, notifications |
| `public/` | Brand images, `sw.js` |
| `supabase/migrations/` from `20260817025510` | Pilot schema |
| `supabase/sql/` | `promote_pilot_role.sql`, `seed_unit_8200.sql` |
| `tests/*.test.ts` | Next.js unit tests |
| `handoff/` | This package |
| `*.html`, `assets/`, `build_*.py`, `content/`, `tools/`, `emails/`, `partner-kit/` | Leftover static site. Not served by Next. |

---

## 3. Supabase objects used

See `handoff/00-SUBMISSION-GUIDE.md` §2 for the table list. 38 public tables queried. 22 RPCs from the app. 4 storage buckets. No views. No Next.js `functions.invoke`.

Pilot applied migrations through `training_overview_video` (`trainings.overview_video_url`). This branch’s last committed migration file is `20260818230000_training_overview_video.sql`. Filenames and applied versions differ (dashboard timestamps vs repo timestamps). Unused `platform_assessments*` sandbox tables remain on Pilot and are not queried.

---

## 4. Environment

This Cloud Agent workspace has **no** `.env.local` and **no** `NEXT_PUBLIC_SUPABASE_*` in the process environment. The app is written to fall back to Pilot (`lib/supabase/env.ts`).

| Variable | Required? | Present here |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Required in production config; fallback exists | No (fallback) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `ANON_KEY` | Same | No (fallback) |
| `NEXT_PUBLIC_SITE_URL` | Auth redirects / email links | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron, some admin | No |
| `CRON_SECRET` | Cron routes | No |
| `RESEND_API_KEY` / `EMAIL_PROVIDER` / `EMAIL_FROM` | Email | No |
| VAPID keys | Web push | No |
| `YOUTUBE_API_KEY` | Auto runtime | No |
| Sentry DSN / org / project / token | Telemetry | No |

---

## 5. External services

| Service | Status on this line |
|---|---|
| Supabase Pilot | Active; used |
| Supabase fathers-com-platform | Inactive; unused |
| Vercel `fathers-com-pilot` | Stale Next deploy |
| Vercel `fathers-com-platform` | Next from `main` |
| YouTube (session embeds) | youtube-nocookie iframes; Data API optional |
| Resend | Optional |
| Web Push | Optional |
| Sentry | Wired; no-op without DSN |
| Stripe / e-sign / edge functions | Not called from Next.js |

Sidebar source of truth: `components/layout/app-nav.tsx`.
