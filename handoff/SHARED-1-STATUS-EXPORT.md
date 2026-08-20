# Shared 1 status export — fathers-com-platform

**For:** GrokBot full audit  
**Written:** 2026-08-20  
**Accuracy rule:** Only what is present in this checkout and on Pilot. Nothing invented.

---

## 1. Current branch / environment

| Item | Value |
|---|---|
| **Desk badge** | **Shared 1-1.50** (this export file). Product work described below is **Shared 1-1.49**. |
| **Active branch** | `cursor/clean-pilot-ux-refinements-7c78` |
| **Last product SHA** | `191074403c8609f8fbdbb979ff4505b7ebadee26` — Turn anonymous sharing on by default for fathers and leaders. |
| **This export SHA** | Added after 1.49. Badge ticked to 1.50 for the markdown only. No product behavior change. |
| **Working tree** | Clean, tracking `origin/cursor/clean-pilot-ux-refinements-7c78` |
| **This checkout is** | The Shared 1 desk. Not Submit 2. Not Shared 2. Not `main`. |
| **Base** | `origin/clean-pilot` = `b950131` (*Use the Pilot Supabase project when production has no env vars.*) |
| **Commits ahead of `clean-pilot`** | 87 |
| **Preferred PR** | https://github.com/StrategyandDesign/fathers-com-platform/pull/110 (draft; base `clean-pilot`) |
| **PR title (human, do not overwrite)** | Clean-pilot UX: Film-first catalog, session header, assessments slot |
| **Repo (internal)** | `StrategyandDesign/fathers-com-platform` |
| **Shared review copy** | `StrategyandDesign/fathers-com-clean-pilot` (`review` moves; `submit/2` is frozen) |
| **shared-source.json** | `{ "repo": "StrategyandDesign/fathers-com-platform", "branch": "cursor/clean-pilot-ux-refinements-7c78" }` |
| **Cloud Agent workspace** | `/workspace` (this export). Not Micah’s laptop. |
| **Micah local path (documented)** | `/Users/adm/Projects/fathers-com-platform` at `http://127.0.0.1:3000` |
| **Pilot Supabase** | `koeplcybddrvbliuepsy` |
| **Official frozen review** | Submit **2** on `submit/2` (19 Aug 2026). Next official submit is **4**. |

### Version number (use this)

**Shared 1-1.50** (badge after this export)  
**Product state to audit:** **Shared 1-1.49** / `1910744`

Shown by `components/dev/version-stamp.tsx` from `shared-mark.json` via `loadSharedMark()`. Hidden when `NODE_ENV === "production"`. Format: `Shared 1-1.xx`. Auto-tick is the desk pre-commit hook (`scripts/git-hooks/pre-commit` → `scripts/shared-revision.mjs --pre-commit`) on this branch only.

**Ledger caveat:** `shared-mark.json` listed **1.49** as “Remove the Skills used count from Leader desks” while `1910744` (anonymous sharing default-on) was already on the branch under that same badge. This export commit ticks the badge to **1.50**. 1.50 is documentation only. Do not invent Shared 2.

### What this is not

- Not `main` (`origin/main` is a sibling line; shared merge-base with the desk is `b950131`).
- Not Submit 2 (`submit/2` stays frozen).
- Not Shared 2 (do not invent it).
- Cloud Agent cannot write Micah’s laptop. A hard refresh will not show VM-only edits until he pulls this branch.

```
cd /Users/adm/Projects/fathers-com-platform && git fetch origin cursor/clean-pilot-ux-refinements-7c78 && git checkout cursor/clean-pilot-ux-refinements-7c78 && git pull origin cursor/clean-pilot-ux-refinements-7c78
```

---

## 2. What has been completed (present in this checkout)

### 2.1 Five hardening areas

#### A. Reporting simplicity for Org Managers — **present**

Assignment-level report (one row per man × assigned training). Statuses: `not_started | in_progress | completed`. CSV and PDF export. Email omitted. Dashboard has a Reports card (men / completed / in progress) plus CSV and a link to `/manager/reports`.

**Skills used is gone** from Leader reports, CSV, PDF, participant cards, and Home stats. Tests assert the string is absent.

**Nav:** Header chip menu is Dashboard + Impact Snapshot only. **Sidebar still has Reports.**

| Files | |
|---|---|
| `lib/manager/reports.ts` | Builder + CSV |
| `lib/manager/report-pdf.ts` | PDF |
| `app/(manager)/manager/reports/page.tsx` | Reports desk |
| `app/(manager)/manager/page.tsx` | Home Reports card |
| `components/layout/manager-header-menu.tsx` | Slim header (no Reports) |
| `components/layout/app-nav.tsx` | Sidebar still lists Reports |

Not on this desk: `docs/ORG-MANAGER-REPORTING-AUDIT.md` (lives on `cursor/manager-reporting-simplicity-7c78` only).

#### B. Assignment and visibility under time pressure — **partial (built, then hidden)**

Present:

- Leader first-run desk (`/manager/start`, `gateManagerOnboarding`).
- Catalog **Include / Decline / View** on one row.
- Certificates under the participant roster (`CertificateDesk` below the list).
- Quiet participants / nudge panel on Home and Participants.
- Assign removed from the training View page.
- “Everyone has this” kept off the cohort action row.

Implemented **then hidden** (code exists; not rendered):

- `AssignmentStatusStrip` — not imported on Manager Home.
- `AssignmentBoard` (who-has-what) — not rendered on Participants.

Hidden by later desk commits (`479d807`, `a018397`), not because the work was never built. Tests in `tests/manager-assignment-status.test.ts` assert the surfaces stay off Home and Participants.

| Files | |
|---|---|
| `components/manager/assignment-status-strip.tsx` | Built, unused on Home |
| `components/manager/assignment-board.tsx` | Built, unused on Participants |
| `lib/manager/assignment-status.ts` | Board/status logic still in tree |
| `components/manager/training-catalog.tsx` | Include / Decline / View |
| `app/(manager)/manager/start/page.tsx` | First-run Leader desk |
| `app/(manager)/manager/participants/page.tsx` | Roster + certificates; no board |

Not on this desk: `docs/ORG-MANAGER-ASSIGNMENT-TEMPO-AUDIT.md`.

#### C. Facilitation support when the manager is not the facilitator — **present (lightweight)**

What exists (not a facilitator portal, not live co-watch):

- Optional **Training Summary** (`leader_summary`, cap 4000). Super-admin create/edit. Shown on Leader **View training**. Not on father catalog cards. Not required for Ready/Release.
- Training **overview film** (YouTube/Vimeo). Hidden after a session is started (`hasStartedTrainingWork` / `shouldOpenOverview` in `lib/father/training-door.ts`).
- Super-admin **PDF handouts** on a training; father and Leader View can open them.
- Leader **practice** desk (`/manager/practice`) so a Leader can walk the film without being the man.

There is no creator portal, no Lottie lesson type, no auto-Include, and no “I am not the facilitator” role switch.

| Files | |
|---|---|
| `lib/admin/development.ts` | `LEADER_SUMMARY_MAX = 4000` |
| `lib/admin/actions.ts` | Persist `leader_summary` |
| `app/(admin)/admin/trainings/new/page.tsx` | Create field |
| `app/(admin)/admin/trainings/[id]/page.tsx` | Edit field |
| `app/(manager)/manager/reviews/[trainingId]/page.tsx` | Leader View summary |
| `lib/father/training-door.ts` | Overview vs session door |
| `lib/training-handouts/*` | Handout storage/UI |
| `app/(manager)/manager/practice/page.tsx` | Leader practice |

#### D. Mandatory vs voluntary context — **present (wording only)**

Modes: `unset | expected | open` (`lib/participation.ts`). Leader Account card **How men take assigned training**. Saves per group. Changes reminders, Home, and status wording through `participationCopyKey`. **Who you can assign does not change.**

Hints in this checkout:

- **Expected:** Rehab, Armed Forces Unit, or Performance Optimization Group where completion is expected.
- **Open:** Workout groups and other voluntary clubs where men set the pace.
- **Unset:** Plain language. Neither required nor invitational.

Notification copy varies by mode (`lib/notifications/copy.ts`). Father-facing notes still strip `!` and em dashes and avoid the forbidden word list in `tests/nudge-panel.test.ts`.

| Files | |
|---|---|
| `lib/participation.ts` | Parse + copy-key suffix |
| `components/manager/participation-mode-card.tsx` | Leader card |
| `lib/notifications/copy.ts` | Mode-aware notes |
| `lib/i18n/messages/en.ts` / `he.ts` | Expected / Open / Unset copy |
| `supabase/migrations/20260819210000_group_participation_mode.sql` | Column |

Participation lead uses a **colon**, not an em dash (1.48).

#### E. Lightweight outcome signals beyond completion — **present for fathers; Leader count removed**

Father tap after a completed session: **Completed / Not yet / Dismiss** (`used` / `later` / `dismissed`). Offered on session closeout and on Home (first login or after a long stretch away; `SKILL_USE_HOME_AWAY_MS`, cookie `fc_home_desk`). Statement formatter turns topic fragments into a practice line.

`countSkillsUsed()` still exists in `lib/father/skill-use.ts`. It is **not shown** on Leader Home, reports, CSV, PDF, or participant cards (removed in `ba89972`).

This is a tap, not an instrumented outcome study.

| Files | |
|---|---|
| `lib/father/skill-use.ts` | Parse, next state, count helper |
| `components/father/skill-use-card.tsx` | Three-button card |
| `lib/father/home-desk.ts` | Home offer gate |
| `components/father/session-closeout.tsx` | Closeout embed |
| `supabase/migrations/20260819220000_session_skill_use.sql` | Column |
| `supabase/migrations/20260820010000_session_skill_use_dismissed.sql` | Dismissed |

---

### 2.2 Dark / Light palette — **present, Account only**

| Fact | |
|---|---|
| Control | `components/account/palette-form.tsx` (`PaletteSwitcher`) |
| Cookie / storage | `fc_palette` (`lib/theme/palette.ts`) |
| Default | Dark |
| Header | Stays black (`--header: #0a0a0a` in light and dark) |
| Header chips | `headerChipClassName` = `border border-border bg-card text-card-foreground` |
| Not in header | Tests forbid `PaletteSwitcher` in the shell |
| Photo management | Org Photos only (`/manager/account/photos`). Not on Account chrome. |

---

### 2.3 Other significant work on this desk (actually present)

Grouped from commits on `origin/clean-pilot..HEAD`. This is the Shared 1 product line, including work that landed before the 1.01 badge.

**Desk / review process**

- Shared 1 stamp, revision tick, `/api/dev-sync` local poll, live-reload (dev only).
- Submit 2 record; next submit is 4.
- Handoff docs for the isolated review repo (`handoff/*`, `SUBMITS.md`, `SHARED.md`).
- Local bind documented as `127.0.0.1:3000`.

**Catalog and Super-admin**

- Film-first catalog; Include / Decline / View on one row.
- Training overview as its own slot; green keyline on that slot.
- Super-admin Assessments on the Trainings desk (same list pattern).
- Gathering nav under Users.
- Bring-in queue; outline hard-cap `OUTLINE_SESSION_MAX = 20` (quiet warning; copy does not advertise 15 or 20).
- Super-admin panoramic login background; **default is black** until a photo is uploaded (woods default removed).
- Super-admin PDF handouts on a training.
- Leader email invite + first-run desk.

**Father Home**

- Available vs completed shelves; keylines; session count under titles.
- Completed covers on the left; extra completed items compact to titles.
- Finished trainings can be watched again (first session film).
- Clickable http(s) links in the Home update (`lib/cohort-note/links.ts`).
- Empty “What they see” preview hidden until the Leader types.
- Weekly “When to send it” hidden when weekly reminder is off.
- Overview film not reopened after a session is started.
- Check-in save freeze fix (radio → Save).
- Keystone results on the Assessments tab.
- Certificates under the participant list (Leader).
- Streak dialog: green week-square logo removed.
- Mobile account avatar on the right.
- Login lockup enlarged; sits on the platform line.

**Certificates / identity**

- Issued by uses the Leader’s displayed name (not “Fathers.com Leader”).
- Home certificate preview + Fathers.com lockup.
- `issuer_name` snapshot on `certificates` (`20260820060000_certificate_issuer_name.sql`).

**Companion / chrome**

- Companion designation is **Agent** (not a second “Assistant”).
- Leader practice under Quiet participants; Quiet under invite + open items.
- Manager vs Leader as a displayed designation only (role stays `manager`).
- Org mark in the side ribbon above Home, not beside the Fathers lockup.

**Copy / i18n**

- Sentence em dashes removed from EN/HE UI strings except `common.emDash` (empty-cell placeholder). `tests/copy-hygiene.test.ts`.
- Isolated `he.ts` is still preserved on shared publish; matching keys are still required in `lib/i18n/messages/he.ts`.

**Anonymous Gathering (HEAD)**

- `share_anonymous_admin` default **on** for **father** and **manager** (insert trigger + backfill of active rows).
- Reviewers stay **off** until they turn it on.
- Super-admin never shares.
- RPC `admin_anonymous_gathering` already existed; Super-admin Home now shows a live snapshot (fathers sharing, leaders sharing, sessions completed, assignments).
- **Applied on Pilot** (2026-08-20): fathers **10/10** sharing, leaders **6/6** sharing, reviewers **0/5**, admin **0/1**. Event counts observed at apply time: 13 sessions completed, 8 assignments, 1 certificate issued (the certificate cell stays hidden under k-anonymity of 3).

**Fundraising (docs only, not a public page)**

- `partner-kit/fundraising-one-pager.md`, `partner-kit/fundraising-brief.md`.
- Sources restricted to 2018–2026. Working ask **$260,000**. Seat $120 treated as retired in that copy.

**Constraints still in force in this tree**

- Rehab directors = Org Managers (`manager`). UI chrome says **Leader**.
- No public open Leader `/signup`.
- No `user_metadata` authorization (`lib/auth/roles.ts` uses `app_metadata.role`).
- `SHOW_MILITARY = False` (`build_pages.py`). Coming Home is rehab-first.
- No Stripe checkout wired on clean-pilot product pages. Seat $120 is retired in positioning copy. Stripe **edge function code still exists** (`supabase/functions/checkout`, `stripe-webhook`) with a `price_cents: 12000` default — unused unless those functions are deployed and keyed.
- Product TS/TSX does not print `evidence-based`. Docs may discuss the bar (`docs/EVIDENCE-BAR.md`).
- No creator portal, no Lottie lesson type, no auto-Include.

---

### 2.4 Desk revision ledger (1.01–1.49)

From `SHARED.md` / `shared-mark.json`. Dates in the markdown table were written as `undefined` by the tick script; `shared-mark.json` has `2026-08-19` then `2026-08-20`.

| Rev | What the ledger says landed |
|---|---|
| 1.01–1.02 | Shared badge + tick on each push |
| 1.03 | Photo work on Org Photos; Light header contrast |
| 1.04 | Assignment-level report |
| 1.05 | Assignment and status on first Leader screens |
| 1.06 | Expected / Open framing |
| 1.07 | Optional I-used-it tap |
| 1.08 | Collapse audit sessions until opened |
| 1.09 | Hide assignment status on Home |
| 1.10 | Hide who-has-what on Participants |
| 1.11 | Include / Decline / View on one catalog row |
| 1.12 | Session subtitle under title on audit list |
| 1.13 | Clarify Expected / Open hints |
| 1.14–1.16 | Skill-use buttons + statement line |
| 1.17 | Finished trainings in their own Home row |
| 1.18 | Everyone-has-this off cohort row |
| 1.19 | Scroll available trainings after three cards |
| 1.20 | Name Rehab / Armed Forces Unit / Performance Optimization Group |
| 1.21 | Leader email invite + first-run desk |
| 1.22 | Remove Assign from training View |
| 1.23–1.25 | Home completed shelf, keylines, lockup + certificate preview |
| 1.26–1.27 | Skill-use on first login / after away; Dismiss on Home |
| 1.28–1.30 | Your Trainings shelf; certificate snapshot; overview green keyline |
| 1.31 | Super-admin panoramic login background |
| 1.32–1.34 | Session count; compact extras; available/completed keyline |
| 1.35 | PDF handouts |
| 1.36–1.37 | Completed covers left; watch again |
| 1.38 | Leader name on Issued by |
| 1.39 | Mobile account avatar on the right |
| 1.40–1.42 | Open audience; login lockup; participation lead |
| 1.43 | Clickable Home-update URLs |
| 1.44–1.45 | Bring-in queue; outline cap 15 then 20 (quiet) |
| 1.46 | Donor fundraising copy (2018–2026) |
| 1.47 | Login default black |
| 1.48 | Drop em dash from participation lead |
| 1.49 | Ledger title: Remove Skills used count. Tree also contains anonymous sharing default-on (`1910744`). |
| 1.50 | This status export (`handoff/SHARED-1-STATUS-EXPORT.md`). No product behavior change. |

---

## 3. What is still on other branches or missing

Do **not** merge these onto Shared 1 unless someone asks. The desk already contains most `-7c78` feature code.

| Branch | Unique vs desk | Ported? |
|---|---|---|
| `cursor/manager-reporting-simplicity-7c78` | Audit markdown | Code yes; `docs/ORG-MANAGER-REPORTING-AUDIT.md` no |
| `cursor/assignment-visibility-tempo-7c78` | Audit markdown | Code yes; `docs/ORG-MANAGER-ASSIGNMENT-TEMPO-AUDIT.md` no |
| `cursor/mandatory-voluntary-context-7c78` | Audit markdown | Code yes |
| `cursor/skill-use-signals-7c78` | Earlier tap + audit doc | Desk evolved past the branch (Completed / Not yet / Dismiss + Home gate) |
| `cursor/training-summary-7c78` | Same idea, different SHA | Yes (`leader_summary`) |
| `cursor/hide-overview-after-start-7c78` | Same idea | Yes (`training-door.ts`) |
| `cursor/hide-weekly-when-7c78` | Same idea | Yes (`shouldShowReminderSchedule`) |
| `cursor/hide-update-preview-7c78` | Same idea | Yes |
| `cursor/light-dark-palette-7c78` | Header-switcher iterations | Desk kept **Account only** |
| `cursor/live-sync-loop-7c78` | Middleware-only `/api/dev-sync` | Desk has a later route + `DevLiveReload` |
| `cursor/assessments-tab-results-7c78` | Stacked side branches | Feature yes |
| `cursor/admin-assessments-desk-7c78` | Feature commit | Yes |
| `cursor/training-overview-video-7c78` | Feature commit | Yes |
| `cursor/remove-streak-logo-square-7c78` | Feature commit | Yes |
| `cursor/certificates-below-roster-7c78` | Feature commit | Yes |
| `cursor/quiet-update-preview-7c78` | Feature commit | Yes |
| `cursor/fix-checkin-save-freeze-7c78` | Feature commit | Yes |
| `cursor/fix-prod-supabase-env-7c78` | 0 ahead | Fully contained (`clean-pilot` tip) |
| `cursor/ship-clean-pilot-7c78` | 0 unique product work | Ancestor |
| `cursor/clean-pilot-handoff-audit-7c78` | 0 ahead | Fully contained |
| **`cursor/organize-review-repo-7c78`** | 6 commits (review-repo overlay, README split) | **Not on desk** |
| **`origin/cursor/org-logo-sidebar-only-0b8c`** | 1 commit off this HEAD | **Not on desk**; would fight current header/start UX |
| `origin/cursor/session-closeout-0b8c` | Old `main` stack | Desk has closeout + skill-use; not a straight merge |
| `origin/cursor/action-framework-display-0b8c` | Old `main` stack | Core Action display is on desk |
| `origin/cursor/manager-practice-below-update-0b8c` | Reorder | Desk already places practice below the Home update |
| `origin/cursor/hide-empty-org-logo-0b8c` | Old `main` stack | Desk already hides empty logo chrome |
| **`origin/main`** | Pilot course texture PR #111 (`d662e52`) | **Not on desk** |

Open PRs #113–122 and #103–108 describe work that is already on this desk unless you want the leftover audit markdown or exact branch SHAs.

### Hardening items that are incomplete (not absent)

1. **Assignment tempo:** strip and board are hidden. First-screen assignment is therefore weaker than 1.05 originally shipped.
2. **Reporting:** slim header omits Reports; sidebar still has it. Two nav stories.
3. **Facilitation:** summary + handout + practice only. No facilitator-of-record workflow.
4. **Mandatory / voluntary:** copy and reminders only. Assignment rights unchanged.
5. **Outcome signals:** father tap only. Leader aggregate removed. No analysis export of skill-use.

---

## 4. Key files changed (most important)

Not a full 87-commit file list. These are the files an auditor should open first.

**Version / desk**

- `shared-mark.json`, `SHARED.md`, `shared-source.json`
- `lib/dev/shared-mark.ts`, `components/dev/version-stamp.tsx`
- `scripts/shared-revision.mjs`, `scripts/git-hooks/pre-commit`

**Hardening**

- `lib/manager/reports.ts`, `lib/manager/report-pdf.ts`, `app/(manager)/manager/reports/page.tsx`
- `lib/manager/assignment-status.ts`, `components/manager/assignment-status-strip.tsx`, `components/manager/assignment-board.tsx`
- `lib/participation.ts`, `components/manager/participation-mode-card.tsx`, `lib/notifications/copy.ts`
- `lib/father/skill-use.ts`, `components/father/skill-use-card.tsx`, `lib/father/home-desk.ts`
- `lib/admin/development.ts`, `app/(manager)/manager/reviews/[trainingId]/page.tsx`
- `lib/father/training-door.ts`

**Palette / login / Gathering**

- `lib/theme/palette.ts`, `components/account/palette-form.tsx`, `app/globals.css`
- `lib/platform-photos/data.ts`, `lib/platform-photos/slots.ts`, `app/(auth)/layout.tsx`
- `lib/account/anonymous-share.ts`, `lib/admin/gathering.ts`, `lib/admin/gathering-model.ts`
- `app/(admin)/admin/page.tsx`, `app/(admin)/admin/gathering/page.tsx`
- `supabase/migrations/20260820070000_anonymous_share_default_on.sql`

**Copy / tests**

- `lib/i18n/messages/en.ts`, `lib/i18n/messages/he.ts`
- `tests/copy-hygiene.test.ts`, `tests/participation.test.ts`, `tests/skill-use.test.ts`
- `tests/manager-reports.test.ts`, `tests/anonymous-share.test.ts`, `tests/login-background.test.ts`
- `tests/palette.test.ts`, `tests/training-summary.test.ts`

**Also load-bearing**

- `components/layout/manager-header-menu.tsx`, `components/layout/app-nav.tsx`
- `lib/auth/roles.ts`, `lib/admin/sourcing.ts`
- `lib/cohort-note/links.ts`
- `partner-kit/fundraising-brief.md`, `partner-kit/fundraising-one-pager.md`
- `components/manager/training-catalog.tsx`

---

## 5. Current known gaps or risks

1. **Micah’s laptop can be behind this SHA.** The Cloud Agent cannot write `/Users/adm/Projects/fathers-com-platform`. Until he pulls, Account/Gathering/login UI will look old even if Pilot data already changed.
2. **Pilot Gathering data is already live.** The default-on migration was applied to `koeplcybddrvbliuepsy` on 2026-08-20. Old Gathering UI will start showing counts on refresh. New Super-admin Home snapshot needs this branch’s JS.
3. **k-anonymity = 3.** Cells that would describe fewer than 3 people stay hidden. On Pilot, 1 certificate issued will show as an empty cell even though fathers and leaders are sharing.
4. **Reviewers are still opt-in (off).** Only fathers and leaders were defaulted on.
5. **Assignment strip/board hidden.** Do not un-hide unless asked. Leaders under time pressure do not see those first-screen boards.
6. **Reports in two places.** Header omits Reports; sidebar still has it.
7. **Skill-use has no Leader readout.** Intentional after 1.49. Super-admin Gathering does not currently include skill-use taps.
8. **Shared-mark title lag.** Badge 1.49 vs HEAD subject (anonymous sharing).
9. **`he.ts` isolation.** Shared publish preserves an isolated Hebrew file. Desk still edits `lib/i18n/messages/he.ts`. Drift is a known process risk.
10. **Gathering page copy is hardcoded English**, not i18n.
11. **Stripe functions remain in the repo** with a $120 default. Clean-pilot product pages do not sell seats; do not treat that as a live price.
12. **`main` course texture (#111) is not on this line.** Do not assume desk and production Vercel (`fathers-com-platform.vercel.app` on `main`) match.
13. **Production Vercel vs Pilot vs Submit 2** are different trees. `PILOT.md` / handoff already warn about this.
14. **Pilot passwords** (`12345`) are weak by design and documented. Not production.
15. **Fundraising copy is markdown in `partner-kit/`**, not a public route.
16. **Live reload / Shared stamp** are local/dev. Production hides the stamp.
17. **No end-to-end browser pass** of Gathering default-on, login black, or the last Home layout changes was recorded in this Cloud Agent run beyond unit tests (`tsx --test` on touched files, `tsc --noEmit`).
18. **Training Summary is unused until Super-admin types one.** Empty summaries stay hidden.
19. **Participation mode does not change assignability.** A Leader can still assign in Open or Unset.
20. **Do not send reviewers to other feature branches** for the current product. The desk is the Shared 1 line.

---

## 6. Recommended next actions (priority order)

1. **Pull Shared 1-1.49 (`1910744`) on Micah’s machine** and hard-refresh Leader Account, Super-admin Home, Gathering, and login. Confirm the toggle starts **on** for a Leader and a father; confirm Gathering is no longer “Waiting on consent.”
2. **Walk Gathering with a Super-admin seat** and record which cells appear vs stay hidden (expect certificate count hidden at 1). That is the real-world test of the wiring, not another branch.
3. **Leave assignment strip/board hidden** unless product asks to bring 1.05 back. If asked, it is a show/hide change, not a rebuild.
4. **Do not merge** `cursor/organize-review-repo-7c78`, `origin/cursor/org-logo-sidebar-only-0b8c`, or `origin/main` #111 onto this desk unless explicitly requested.
5. **Do not open Shared 2.** Next official frozen copy is **Submit 4** from `review` after the isolated repo is updated, per `SUBMITS.md`.
6. **Decide reviewer sharing.** Still off. Only change if product wants reviewers in Gathering.
7. **Decide Reports nav.** Either keep sidebar Reports as the hand-up path or remove it to match the slim header. Do not add Reports to `manager-header-menu.tsx` unless asked.
8. **Optional:** rewrite the 1.49 ledger title so it names anonymous sharing, or tick a new revision on the next product commit. Cosmetic; does not change behavior.
9. **Optional:** port the four audit markdown files from the hardening branches if GrokBot wants the original problem statements. Code is already here.
10. **Do not** print “evidence-based,” revive seat $120, enable `SHOW_MILITARY`, authorize from `user_metadata`, or build a creator portal.

---

## 7. How to reproduce this checkout

```
git fetch origin cursor/clean-pilot-ux-refinements-7c78
git checkout cursor/clean-pilot-ux-refinements-7c78
git pull origin cursor/clean-pilot-ux-refinements-7c78
git rev-parse HEAD
# product behavior to audit: 191074403c8609f8fbdbb979ff4505b7ebadee26
# badge after this export: Shared 1-1.50
```

Tests used on the last product commits (not a full suite):

```
npx --yes tsx --test tests/anonymous-share.test.ts tests/copy-hygiene.test.ts tests/participation.test.ts tests/skill-use.test.ts tests/manager-reports.test.ts
npx tsc --noEmit
```

`tsx` is not a package dependency; use `npx --yes tsx`.

---

## 8. One-line identity for the auditor

**This is Shared 1. Badge Shared 1-1.50 is this export. Product to audit is Shared 1-1.49 / `1910744` on `cursor/clean-pilot-ux-refinements-7c78`, base `clean-pilot` `b950131`, PR #110, Pilot `koeplcybddrvbliuepsy`. All five hardening areas have code on this desk; assignment first-screens were later hidden; skill-use is father-only; anonymous sharing is on for fathers and leaders and already backfilled on Pilot.**
