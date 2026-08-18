# Fathers.com Clean Pilot — Auditor Link Report

**Date:** 18 August 2026  
**Audience:** External / counsel / program auditor  
**Purpose:** Explain what the clean-pilot deployment is, list every live URL an auditor can open, and give role-by-role flows so you can walk the product without guessing.

This document describes the **Next.js clean-pilot app**, not the older static HTML Fathers.com site.

---

## 1. What you are looking at

Fathers.com clean-pilot is a **signed-in training platform** for adult fathers and the people who run their programs.

A father is invited by an organization, watches a short film, answers a check-in, and completes one action. That rhythm is always:

**Film → Check-in → Action**

A **Leader** (internal role `manager`) assigns trainings, reviews new catalog releases, issues certificates, and can send custom assessments. A **Reviewer** sees anonymized cohort totals only. A **Super-admin** runs the catalog, organizations, users, and support inbox.

This is a **pilot**. Legal pages are labeled as counsel templates. Test passwords are weak on purpose. Do not treat this stack as production `fathers.com`.

| What it is | What it is not |
|---|---|
| A Next.js app on Vercel project `fathers-com-pilot` | The old static site on `fathers-com-platform` |
| Auth and data on Pilot Supabase project `koeplcybddrvbliuepsy` | Production fathers.com DNS or the production Supabase project |
| Four app roles: father, manager (shown as Leader), reviewer, admin | The older HTML role set (`admin.html`, `studio.html`, `lead.html`, Keystone Profile) |
| Certificates issued by a Leader | Public certificate URLs |
| Assessments assigned by a Leader | The retired Keystone / Father Profile product (those URLs redirect) |

---

## 2. Hosts — do not mix these up

| Host | What it is | Auditor action |
|---|---|---|
| **https://fathers-com-pilot.vercel.app** | **Live clean-pilot app.** This is the deployment to investigate. | Start here. |
| **https://fathers-com-platform.vercel.app** | Older **static HTML** production project. Different product. | Do **not** use this to judge clean-pilot. |
| **https://github.com/StrategyandDesign/fathers-com-platform** | Source repo. Live app tracks branch `clean-pilot`. | Read code / PRs only. |
| **https://github.com/StrategyandDesign/fathers-com-platform/pull/90** | Open PR with work **not fully on live yet** (see §4). | Use only if asked to review unreleased surfaces. |
| **https://koeplcybddrvbliuepsy.supabase.co** | Pilot Auth + Postgres + Storage API. Not a human homepage. | No click-through product UI. |
| **https://supabase.com/dashboard/project/koeplcybddrvbliuepsy** | Pilot Supabase dashboard (requires a Supabase login). | Infrastructure only. |
| `fathers.com` / `app.fathers.com` | Canonical public brand / future production. | **Not** attached to this pilot. |

Probed on 18 August 2026: every gated app path on the live host returns **307 → `/login?next=…`** when signed out. Public pages return **200**. Unknown paths return **404** with “This page isn’t available” and **Go home** → `/` → `/login`.

---

## 3. How to sign in (pilot test seats)

Open **https://fathers-com-pilot.vercel.app/login**

Login and signup are **English / LTR** on the current PR. **Live** still shows an English / עברית toggle on login. After sign-in, Unit 8200 seats resolve to **Hebrew + RTL**. Other orgs stay English.

**Shared pilot password (all four seats below): `12345`**

These are weak, shared, pilot-only credentials. They are not production. Rotate them if this file leaves the working group.

| Email | Role you will see | Lands on |
|---|---|---|
| `father1@il` | Father in **Unit 8200** (Hebrew) | `/father` |
| `father2@il` | Second Unit 8200 father | `/father` |
| `manager@il` | Leader for Unit 8200 | `/manager` |
| `reviewer@il` | Reviewer (anonymized Insights) | `/reviewer` |
| `admin@fathers` | Super-admin (not `admin@fathers.com`) | `/admin` |

Use three browsers or profiles so cookies do not collide. A signed-in user who opens `/login` is sent to their home. A father who opens `/manager` or `/reviewer` is sent to `/father`. The same rule applies the other way: the door matches the role in `auth.users.raw_app_meta_data.role` and `public.profiles.role`.

Signup (`/signup`) is **fathers only** and needs an organization invite code. Leaders and super-admins are not created from that form.

---

## 4. Live `clean-pilot` vs this PR

Investigate **live** first. Then, if asked, the open PR.

| Surface | Live `fathers-com-pilot.vercel.app` (`clean-pilot`) | PR #90 (this branch) |
|---|---|---|
| Father Home, Film → Check-in → Action | Yes | Same |
| Assessments (Leader-assigned, not Keystone) | Yes | Same; empty assessments cannot be assigned |
| Certificates (manager-issued PDF) | Yes (Account + Home when issued) | Also in father **nav** |
| Leader dashboard, participants, impact, reports | Yes | Same |
| Reviewer Insights (codes, not names) | Yes | Impact Summary also in **nav** |
| Super-admin orgs / catalog / users / inbox | Yes | Same |
| Super-admin **Gathering** (anonymous opt-in counts) | Route is gated; UI may 404 until this PR is deployed | Yes — `/admin/gathering` |
| Super-admin **Stage** (walk a training without writing progress) | Not on live | Yes — `/admin/trainings/{id}/stage` |
| Login language toggle | **Visible** (English / עברית) | **Removed** — login stays English |
| Retired Profile URLs | Redirect to Assessments | Same |

Database pieces for Gathering (share columns + RPC + k-anonymity) are already on Pilot. The Gathering **page** ships with this PR.

---

## 5. Public URLs (no login)

Prefix every path with `https://fathers-com-pilot.vercel.app`.

| URL | What it is | Next click |
|---|---|---|
| `/` | Entry. Redirects. | Signed out → `/login`. Signed in → role home. |
| `/login` | Email + password. | Submit → role home. **Create one** → `/signup`. Logo → `/`. Privacy / Terms in the footer. |
| `/signup` | Father join. Invite code + email + password (min 6). | Success → `/father`. **Sign In** → `/login`. |
| `/privacy` | Privacy Policy template (updated 17 August 2026). | Footer **Terms**. Contact text: `Team@Fathers.com`. |
| `/terms` | Terms of Service template. | Footer **Privacy**. |
| `/this-page-does-not-exist` (any unknown path) | Branded 404. | **Go home** → `/`. |

### Public brand files (200, no auth)

| URL | Use |
|---|---|
| `/brand/fathers-com-logo-white.png` | Lockup on login and signed-in chrome |
| `/brand/fathers-com-logo-sage.png` | Alternate lockup |
| `/brand/photos/hero-shoulders.png` | Default Home / session cover |
| `/brand/photos/showing-up-running.png` | Session / training cover |
| `/brand/photos/affirming-highfive.png` | Session cover |
| `/brand/photos/modeling-woods.png` | Session cover |
| `/brand/photos/commitment-teen.png` | Session cover |
| `/brand/photos/knowing-park.png` | Session cover |
| `/brand/photos/protecting-bike.png` | Session cover |
| `/brand/photos/profile-placeholder.png` | Assessment card cover (default pack) |
| `/brand/photos/il/hero.png` | Unit 8200 landscape pack |
| `/brand/photos/il/hills.png` | Unit 8200 landscape pack |
| `/brand/photos/il/desert.png` | Unit 8200 landscape pack |
| `/brand/photos/il/grove.png` | Unit 8200 landscape pack |

Organization logos and replacement photos live in **private** Supabase Storage. They are not public URLs. Certificate PDFs are private; the only supported download is the signed `/api/certificates/{id}/download` route after login.

---

## 6. Compatibility redirects (still open these)

After login, these old bookmarks must not 404.

| You open | You land on | Why |
|---|---|---|
| `/home` | `/father` | Old father home |
| `/father/profile` | `/father/assessments` | Keystone Profile retired |
| `/father/profile/take` | `/father/assessments` | Same |
| `/father/profile/results` | `/father/assessments` | Same |
| `/api/profile/evaluate` | `/father/assessments` | Old scoring POST retired |
| `/manager/compare` | `/manager/impact?tab=compare` | Compare is a tab |
| `/manager/reviews` | `/manager/trainings` | Review queue lives on Trainings |
| `/manager/account/photos` | `/manager/account` | Org logo is on Account now |

`/manager/reviews/{trainingId}` is **not** retired. That is the accept/decline page for one release.

---

## 7. Role walkthroughs (follow these in order)

### 7.1 Father — `father1@il`

Chrome: logo (home), bottom/side nav **Home / Trainings / Assessments / Certificates** (Certificates is on the PR; live: open from Account or Home). Avatar (top right) → Account.

**A. Home** — `/father`

1. Organization mark (Unit 8200) at the top.
2. **Start Here / Continue Training** card for the next session. Primary CTA starts Film.
3. Assessment overlay card if a Leader assigned one.
4. **Your trainings** cards. **View certificates** → `/father/certificates`.
5. Completing an Action returns to `/father?done={sessionId}` with a completion mark.

**B. One session (the core product)**

From Home or Trainings, open a session. Example first Fundamentals film after login:

1. **Film** `/father/sessions/{sessionId}` — cover + YouTube embed (`youtube-nocookie` / `youtube.com/embed/{id}`). Mark watched.
2. **Check-in** `/father/sessions/{sessionId}/checkin` — short questions. Save & Exit returns Home; session stays in progress.
3. **Action** `/father/sessions/{sessionId}/action` — one skill. **I’ll do this later** → Home (not complete). **I completed this Action** → Home, session counts as done.
4. Next incomplete session becomes the Home CTA. Earlier sessions stay locked until prior ones finish.

**C. Trainings catalog** — `/father/trainings`

Lists assigned trainings and session dots. Same continue links as Home.

**D. Assessments** — `/father/assessments`

Leader-written instruments only. Take/continue at `/father/assessments/{assignmentId}`. Results stay on that assignment. This is **not** Keystone.

**E. Certificates** — `/father/certificates`

Issued-by-manager list. Download uses `/api/certificates/{id}/download` (PDF). Empty state links to Trainings.

**F. Account** — `/father/account`

Language (org default / English / Hebrew), anonymous Gathering opt-in (off until he turns it on), notification prefs, certificates preview, **Help** → `/father/help`, Sign out, Privacy, Terms.

**G. Help** — `/father/help`

Problem report to the super-admin inbox. Not a chat.

**What a father must never see:** other fathers’ names in Reviewer style, Super-admin Gathering internals, Leader notes, raw SQL, invite codes of other orgs.

### 7.2 Leader — `manager@il`

Display title is **Leader**. Internal role remains `manager`.

Chrome: Dashboard / Trainings / Participants / Impact Snapshot / Assessments / Reports. Avatar → `/manager/account`. Desktop also has Dashboard | Impact Snapshot in the header.

**Walk this order:**

1. **`/manager`** — Active fathers, assessments completed, sessions, trainings, pending actions. Invite code (copy). Companion panel (who is quiet, who is ready for a certificate). Review queue if a release is waiting. Links to Participants, Impact, Reports, Trainings, Assessments.
2. **`/manager/trainings`** — Accept or decline a released catalog training. Assign after accept. **Request a Training** → `/manager/request`.
3. **`/manager/reviews/{trainingId}?group={groupId}`** — Preview + accept / decline one release. Email CTA from “new training available” lands here.
4. **`/manager/participants`** — Named roster. Open one father.
5. **`/manager/participants/{fatherId}`** — Progress, notes, nudge, assessments, **issue certificate**.
6. **`/manager/participants/{fatherId}/certificates/{trainingId}`** — Certificate preview / issue.
7. **`/manager/participants/bulk`** — Bulk assign / mark complete (reached from Participants, not a nav item).
8. **`/manager/impact`** — Snapshot. **`/manager/impact?tab=compare`** — two groups or two windows.
9. **`/manager/reports`** — Filterable table + CSV / PDF. Links into participant records.
10. **`/manager/assessments`** — Create / edit / assign custom assessments. **`/manager/assessments/new`**. **`/manager/assessments/{id}`**. **`/manager/assessments/{id}/responses/{fatherId}`**.
11. **`/manager/account`** — Display title (Leader / Manager), language, org logo, anonymous share toggle, request training, notifications, help.
12. **`/manager/help`** — Same support form as fathers, stored in the admin inbox.

**What a Leader sees that a Reviewer must not:** names, emails, notes, assessment answers, certificate serials.

### 7.3 Reviewer — `reviewer@il`

Chrome: **Insights** `/reviewer`, **Impact Summary** `/reviewer/summary` (nav on the PR; live: button on Insights), **Account** `/reviewer/account`.

1. **`/reviewer`** — Totals, training distribution, anonymized table (`P-00n` codes, not names). Filters: group, training, status, last-activity dates. CSV is internal (`/api/reviewer/insights/export?format=csv`).
2. **`/reviewer/summary`** — Funder/board page. PDF `/api/reviewer/summary/export?format=pdf`. No names, emails, or serials.
3. **`/reviewer/account`** — Language, anonymous share, notifications, help.
4. **`/reviewer/help`** — Support form.

Open `/manager` or `/father` while signed in as reviewer: you are sent to `/reviewer`.

### 7.4 Super-admin — `admin@fathers`

Chrome: Dashboard, Gathering, Organizations, Trainings, Users, Inbox, Account.

1. **`/admin`** — Org / user / training counts. Cards to new org, new training, Gathering, users, reports + training-request inbox.
2. **`/admin/gathering`** *(PR / after deploy)* — Anonymous counts from people who opted in on **their** Account. k-anonymity: cells describing fewer than 3 people stay hidden. Super-admin Account has **no** share toggle. 0 opted-in on Pilot as of this writing → empty-state “Waiting on consent,” not a 500.
3. **`/admin/organizations`** → **`/admin/organizations/new`** → **`/admin/organizations/{id}`** — Groups, invite codes, locale, release targeting.
4. **`/admin/trainings`** → **`/admin/trainings/new`** → **`/admin/trainings/{id}`** — Catalog. YouTube URLs only (no playlists). Publish / release.
5. **`/admin/trainings/{id}/stage`** *(PR)* — Walk Home / catalog / Film → Check-in → Action **without** writing `session_progress`. Per-session:  
   `/admin/trainings/{id}/stage/sessions/{sessionId}`  
   `/admin/trainings/{id}/stage/sessions/{sessionId}/checkin`  
   `/admin/trainings/{id}/stage/sessions/{sessionId}/action`  
   Query: `?view=home` or `?view=catalog`.
6. **`/admin/users`** → **`/admin/users/{id}`** — Role + deactivate. No signup-as-admin path.
7. **`/admin/support`** — Father/Leader/Reviewer problem reports. `?filter=resolved`. Detail `/admin/support/{id}`.
8. **`/admin/support/requests`** — Training topic requests from Leaders. `?filter=closed`. Detail `/admin/support/requests/{id}`.
9. **`/admin/account`** — Language + notifications. No anonymous-share toggle.

---

## 8. Complete app route catalog

`{id}` values are UUIDs. Do not guess them; click through from lists after login.

### Public / auth / legal

| Path | Gate |
|---|---|
| `/` | Redirect |
| `/login` | Public |
| `/signup` | Public |
| `/privacy` | Public |
| `/terms` | Public |

### Father

| Path | Gate | Notes |
|---|---|---|
| `/father` | father | Home |
| `/father/trainings` | father | Catalog |
| `/father/sessions/{sessionId}` | father | Film |
| `/father/sessions/{sessionId}/checkin` | father | Check-in |
| `/father/sessions/{sessionId}/action` | father | Action |
| `/father/assessments` | father | List |
| `/father/assessments/{assignmentId}` | father | Take / results |
| `/father/certificates` | father | Issued PDFs |
| `/father/account` | father | |
| `/father/help` | father | |
| `/home` | father | → `/father` |
| `/father/profile` | father | → assessments |
| `/father/profile/take` | father | → assessments |
| `/father/profile/results` | father | → assessments |

### Leader

| Path | Gate | Notes |
|---|---|---|
| `/manager` | manager | Dashboard |
| `/manager/trainings` | manager | Queue + assign |
| `/manager/request` | manager | Suggest a training |
| `/manager/reviews` | manager | → `/manager/trainings` |
| `/manager/reviews/{trainingId}` | manager | Accept / decline |
| `/manager/participants` | manager | Roster |
| `/manager/participants/{id}` | manager | One father |
| `/manager/participants/{id}/certificates/{trainingId}` | manager | Issue |
| `/manager/participants/bulk` | manager | Bulk tools |
| `/manager/impact` | manager | Snapshot + `?tab=compare` |
| `/manager/compare` | manager | → impact compare |
| `/manager/reports` | manager | Named export |
| `/manager/assessments` | manager | |
| `/manager/assessments/new` | manager | |
| `/manager/assessments/{id}` | manager | |
| `/manager/assessments/{id}/responses/{fatherId}` | manager | Answers |
| `/manager/account` | manager | Logo lives here |
| `/manager/account/photos` | manager | → account |
| `/manager/help` | manager | |

### Reviewer

| Path | Gate | Notes |
|---|---|---|
| `/reviewer` | reviewer | Insights |
| `/reviewer/summary` | reviewer | Impact Summary |
| `/reviewer/account` | reviewer | |
| `/reviewer/help` | reviewer | |

### Super-admin

| Path | Gate | Notes |
|---|---|---|
| `/admin` | admin | |
| `/admin/gathering` | admin | Anonymous totals (PR UI) |
| `/admin/organizations` | admin | |
| `/admin/organizations/new` | admin | |
| `/admin/organizations/{id}` | admin | |
| `/admin/trainings` | admin | |
| `/admin/trainings/new` | admin | |
| `/admin/trainings/{id}` | admin | |
| `/admin/trainings/{id}/stage` | admin | PR |
| `/admin/trainings/{id}/stage/sessions/{sessionId}` | admin | PR Film |
| `/admin/trainings/{id}/stage/sessions/{sessionId}/checkin` | admin | PR |
| `/admin/trainings/{id}/stage/sessions/{sessionId}/action` | admin | PR |
| `/admin/users` | admin | |
| `/admin/users/{id}` | admin | |
| `/admin/support` | admin | |
| `/admin/support/{id}` | admin | |
| `/admin/support/requests` | admin | |
| `/admin/support/requests/{id}` | admin | |
| `/admin/account` | admin | |

---

## 9. Download / API URLs

All of these are same-origin. Signed-out requests 307 to `/login`, except the retired profile evaluate route.

| URL | Who | What |
|---|---|---|
| `/api/certificates/{id}/download` | Father (own) or managing Leader | Private PDF |
| `/api/reviewer/insights/export?format=csv` | Reviewer | Anonymized codes |
| `/api/reviewer/summary/export?format=pdf` | Reviewer | Impact Summary PDF |
| `/api/manager/reports/export?format=csv` | Leader | Named report |
| `/api/manager/reports/export?format=pdf` | Leader | Named report |
| `/api/manager/impact/export` | Leader | Impact snapshot export |
| `/api/profile/evaluate` | Anyone | **Retired.** 307 → `/father/assessments` |

Query strings on Insights / Summary / Reports (`group_id`, `training_id`, `status`, `from`, `to`) are preserved on those export links.

---

## 10. Catalog on Pilot (what films you will see)

Four published trainings. Super-admin IDs (not personal):

| Order | Title | Slug | Sessions | Training id |
|---|---|---|---|---|
| 1 | Fathering Fundamentals – Seven Secrets of Effective Fathers | `fundamentals` | 9 | `9bdcc386-a0f7-432d-9220-fe7f27cfa080` |
| 2 | Steady Under Pressure | `anger` | 12 | `75348a76-1ca2-4b2d-994c-d9249bf37660` |
| 3 | Coming Home Present | `reentry` | 12 | `533e4d96-3642-4e50-93a2-8a3c37252732` |
| 4 | Flourishing Faith | `flourishingfaith` | **0** | `a7aefb94-505f-4abf-b466-97840a57c2f3` |

Flourishing Faith is published with no sessions yet. Staging / father path will show an empty session list. That is expected.

### Organizations on Pilot (no invite codes in this file)

| Name | Code | Default language |
|---|---|---|
| Returning Home NWA | — | English |
| TatoNet | — | English |
| Singapore Father Center | — | English |
| Unit 8200 | `IL` | Hebrew |

Pilot seats (not deactivated): 10 fathers, 6 leaders, 5 reviewers, 1 super-admin.

### YouTube films the player embeds

Embeds are `https://www.youtube.com/embed/{id}` (CSP also allows `youtube-nocookie.com`). Playlists and non-YouTube URLs are rejected when a super-admin saves a session.

**Fundamentals (real NCF films):**

| # | Session | Watch URL |
|---|---|---|
| 1 | Training Overview | https://www.youtube.com/watch?v=1Tuv_7uYhN0 |
| 2 | First Secret: Commitment | https://www.youtube.com/watch?v=Vaj10-J4MX0 |
| 3 | Second Secret: Knowing Your Child | https://www.youtube.com/watch?v=-omEMXA9iGU |
| 4 | Third Secret: Showing Up Consistently | https://www.youtube.com/watch?v=Yza6Pra56Cs |
| 5 | Fourth Secret: Protecting and Providing | https://www.youtube.com/watch?v=ZQ_etqp_-DU |
| 6 | Fifth Secret: Affirming and Encouraging | https://www.youtube.com/watch?v=bQnb1f9Jv5g |
| 7 | Sixth Secret: Disciplining with Love | https://www.youtube.com/watch?v=EdXDZY5y-Uc |
| 8 | Seventh Secret: Modeling Integrity and Faith | https://www.youtube.com/watch?v=Y8rnrolyvuU |
| 9 | Bonus Eighth Secret | https://www.youtube.com/watch?v=PTdj6-bZ74Q |

**Steady Under Pressure** and **Coming Home Present** currently share one placeholder film for every session:

https://www.youtube.com/watch?v=aqz-KE-bpKQ

That is a known pilot placeholder, not a content defect in the player.

---

## 11. Outbound and infrastructure links

| Destination | Why it appears |
|---|---|
| `https://www.youtube.com` / `https://www.youtube-nocookie.com` | Session films |
| `https://*.supabase.co` and `wss://*.supabase.co` | Auth, data, storage |
| `https://*.sentry.io` | Optional error monitoring (DSN is public-by-design if set) |
| `Team@Fathers.com` | Privacy / Terms contact line |
| Resend (`smtp.resend.com`) | Transactional email if configured. Pilot may no-op if no API key |

No payment, camera, or geolocation APIs. Checkout / e-sign Edge Functions in the repo belong to the **old** static site and are **not** wired into this Next app.

### Email buttons an auditor might receive

If Resend is configured, CTAs resolve on the live origin:

| Event | Button | URL |
|---|---|---|
| Welcome | Sign in | `{origin}/login` |
| Training assigned | Open trainings | `{origin}/father/trainings` |
| Certificate issued (father) | View certificates | `{origin}/father/certificates` |
| Certificate issued (leader) | Open participant | `{origin}/manager/participants/{fatherId}` |
| Training released | Review training | `{origin}/manager/reviews/{trainingId}` |
| Session reminder / nudge | (home) | `{origin}/father` |

`{origin}` is `https://fathers-com-pilot.vercel.app` on this deployment.

---

## 12. Access control (what to try)

Permissions are in **Postgres RLS**, not only the UI.

| Test | Expected |
|---|---|
| Signed out, open `/father` (or any role path) | 307 `/login?next=…` |
| Father opens `/manager` or `/admin` | Redirect to `/father` |
| Reviewer opens `/manager/participants` | Redirect to `/reviewer` |
| Leader opens `/admin` | Redirect to `/manager` |
| Reviewer Insights table | Codes (`P-009`), never a legal name |
| Reviewer Impact Summary / PDF | Counts only |
| Super-admin Gathering | No names, emails, notes, answers, or serials |
| Super-admin Stage | Banner: nothing is saved; `session_progress` unchanged |
| Certificate download as the wrong father | Denied |
| `/api/profile/evaluate` | Redirect to assessments; no scoring |

Avatar **upload is disabled**. Leaders issue certificates. Super-admins do not issue them from the father path.

---

## 13. What we built (product, in one page)

For a father:

1. Join with an invite code or a seeded seat.
2. See the next session, not a menu of programs.
3. Watch the film, answer the check-in, do one action.
4. Optionally take a **custom assessment** his Leader wrote.
5. Download a **certificate PDF** when his Leader issues one.
6. Choose language and whether anonymous counts may go to Gathering.

For a Leader:

1. Hold an invite code and a roster with real names.
2. Accept catalog releases before assigning.
3. Assign trainings, nudge quietly, write notes, issue certificates.
4. Write and assign assessments; read responses.
5. Export named reports and an impact snapshot / compare view.

For a Reviewer:

1. See whether the cohort started, finished a session, finished a training, received certificates.
2. Never see who.

For a Super-admin:

1. Create organizations and users; publish and release trainings (YouTube only).
2. Read support reports and training requests.
3. *(PR)* Stage a training as a father would, without writing his progress.
4. *(PR)* Read Gathering only after enough people opt in.

Retired on this stack: Keystone / Father Profile (128 questions, Primary Edge, Primary Determination). Those URLs remain as redirects so old bookmarks do not 404.

---

## 14. Suggested investigation script (90 minutes)

1. Open `/`, `/login`, `/signup`, `/privacy`, `/terms`, a junk path. Confirm English public chrome (live still has a language toggle).
2. Sign in as `father1@il`. Walk one Fundamentals session Film → Check-in → Action. Open Assessments, Certificates, Account, Help. Confirm Hebrew on this seat.
3. Sign out (Account). Confirm you are back on English login (PR) or the live toggle.
4. Sign in as `manager@il`. Dashboard → Trainings → one participant → Impact → Reports → Assessments. Open `/manager/reviews` and `/manager/compare` and confirm redirects.
5. Sign in as `reviewer@il`. Confirm codes, not names. Open Impact Summary. Try `/manager` and confirm bounce.
6. Sign in as `admin@fathers`. Organizations, Trainings, Users, Inbox. On the PR / post-deploy: Gathering (expect 0 sharing) and Stage on Fundamentals (film plays; progress for `father1` does not change).
7. Signed out, hit `/api/manager/reports/export` and `/api/certificates/{any}/download` — both must bounce to login.
8. Do **not** treat `fathers-com-platform.vercel.app` as this audit.

---

## 15. Source pointers (engineering, not live UX)

| Item | Where |
|---|---|
| Role doors | `lib/auth/roles.ts`, `lib/supabase/middleware.ts` |
| Nav | `components/layout/app-nav.tsx` |
| Father session writes | `lib/father/actions.ts` |
| Staging (no writes) | `lib/admin/stage.ts` |
| Gathering RPC | `supabase/migrations/20260818020000_anonymous_admin_gathering.sql` and later Gathering migrations |
| YouTube allow-list | `lib/father/types.ts` (`youtubeVideoId`, `youtubeEmbedUrl`) |
| Email CTAs | `lib/email/events.ts` |
| Pilot runbook | `PILOT.md` |
| Production (separate stack) | `docs/production-launch.md` |

---

## 16. Document control

| Field | Value |
|---|---|
| Live origin probed | https://fathers-com-pilot.vercel.app |
| Probe date | 18 August 2026 |
| Production branch for the live app | `clean-pilot` |
| Accompanying PR | https://github.com/StrategyandDesign/fathers-com-platform/pull/90 |
| Pilot user inventory | 10 fathers, 6 leaders, 5 reviewers, 1 super-admin (active) |
| Re-seed | Do not. Do not change Keystone question files. |

If a URL in this file 404s on **live** but exists in §4’s PR column, the page is built and waiting on a `clean-pilot` deploy. The door (login redirect) will still exist because `/admin/*` and `/father/*` are role-gated as prefixes.
