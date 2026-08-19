# Org Manager assignment and status visibility under time pressure

Audit of the **clean-pilot** Next.js desk. Primary users: Org Managers (rehab directors and equivalent) and any leader role that assigns training to men in their own organization.

Scope is assignment of **trainings/modules** and **status visibility** for those assignments. Assessment assignment is noted only where it collides with the same screens.

No new tables or roles. Evidence is from the tree that this pass started on (`cursor/hide-overview-after-start-7c78`, descendant of the clean-pilot UX line).

---

## Phase 1 — Current-state audit

### Surfaces that matter

| Surface | Route | Primary files | Data / mutations |
| --- | --- | --- | --- |
| Login | `/login` | `app/(auth)/login/page.tsx`, `lib/auth/actions.ts` | `signIn` → `ROLE_HOME.manager` = `/manager` (`lib/auth/roles.ts`) |
| Dashboard | `/manager` | `app/(manager)/manager/page.tsx` | `loadManagerWorkspace`, `loadReviewQueue` |
| Trainings | `/manager/trainings` | `app/(manager)/manager/trainings/page.tsx` | `assignTrainingToUnassigned` in `lib/manager/training-actions.ts` |
| Catalog / accept | `/manager/trainings#catalog`, `/manager/reviews/[trainingId]` | `components/manager/training-catalog.tsx`, `lib/manager/catalog.ts`, `lib/manager/review-actions.ts` | Accept is a **gate**, not an assignment |
| Roster + bulk | `/manager/participants` | `app/(manager)/manager/participants/page.tsx`, `components/manager/participant-bulk-list.tsx` | One `progressLabel` per man |
| Bulk review | `/manager/participants/bulk` | `app/(manager)/manager/participants/bulk/page.tsx` | GET review, then `runBulkAction` |
| Individual desk | `/manager/participants/[id]` | `app/(manager)/manager/participants/[id]/page.tsx` | `assignTraining` in `lib/manager/actions.ts` |
| Reports | `/manager/reports` | `app/(manager)/manager/reports/page.tsx`, `lib/manager/reports.ts` | One row per man, concatenated assignments |
| Impact | `/manager/impact` | Enrollment / completion numbers, not an assignment matrix | Out of scope except as a dead-end click |
| Practice | `/manager/practice` | Manager takes content as himself | **Not** a group-run or assign surface |

Nav for this role (`components/layout/app-nav.tsx`): Dashboard, Trainings, Participants, Impact, Assessments, Reports, Photos.

Workspace load (`lib/manager/data.ts`): groups where `groups.manager_id =` the signed-in manager, members of those groups, then assignments / progress / certificates for those father ids only.

Assignment write path: `assignTrainingToFather` (`lib/manager/mutations.ts`) inserts `training_assignments` after published + org-review checks. RLS insert requires `current_user_role() = manager` and `manages_father(father_id)` (`supabase/migrations/20260817055625_notify_recipient_and_write_rls.sql`). `manages_father` is `groups.manager_id = auth.uid()` plus membership (`supabase/migrations/20260817025510_pilot_core_schema.sql`).

Prerequisite to assign a released training: org review status `accepted` (`isTrainingAssignable` in `lib/father/types.ts`). Legacy unpublished-release catalog items assign without accept unless declined.

---

### 1. Assignment flows

#### 1.1 One module to one person (training already accepted)

**Path A — individual desk (documented happy path)**

1. Submit login → land on `/manager` (no assignment UI here).
2. Click **Participants** (header or “View all participants”).
3. Click the man’s name → `/manager/participants/[id]`.
4. Scroll past private notes, companion, nudge, Keystone, optional assessments.
5. Training cards show percent + “Assigned” but **no Assign button**.
6. Scroll further past current session and certificate form.
7. Open the Assign Training `<select>`.
8. Pick the module.
9. Click **Assign Training**.
10. Full page redirect back to the same detail URL with `?notice=Training assigned.`

**Step count:** 6 clicks after login (Participants, name, select, option, submit, plus one scroll-as-search). If the leader is already on the roster: **4 clicks + long scroll**.

**Path B — bulk form used for one man**

1. Participants.
2. Tick one checkbox.
3. Leave Action = Assign training (default).
4. Choose training in the second select (if the default is wrong).
5. Click **Review selection** → new page `/manager/participants/bulk`.
6. Click **Assign to 1**.
7. Redirect to `/manager/participants?notice=…`.

**Step count:** 5–6 clicks after login, plus an extra page load. No type-to-confirm for assign (`confirmToken("assign")` is `null` in `lib/manager/bulk.ts`), so the review page is a pure extra decision/load.

**Friction**

- Assign is buried under notes and nudges that are not the job.
- Two form fields (person already known; still a training dropdown).
- Redirect loses scroll position; repeating for a second module means finding the form again.
- Roster row is a link to the man, not an assign control.

**Severity:** High.

#### 1.2 One module to multiple people / a whole cohort

**Path A — Assign remaining (best current path)**

1. Login → Dashboard.
2. Click **Trainings**.
3. Scroll past catalog + waiting queue to **In your cohort**.
4. Click **Assign to N remaining** (`assignTrainingToUnassigned`).
5. Redirect to `/manager/trainings?notice=Assigned to N fathers.`

Counts on that row: `{assigned} of {total} assigned` only. No not-started / in-progress / done split. No names.

**Step count:** 3 after login; **1 click** if already on Trainings.

No 40-person cap. Eligible = members of that group (or all manager groups for legacy catalog rows) who do not already have the assignment.

**Path B — roster bulk**

1. Participants.
2. Select all (header checkbox; desktop only for the “all” control — mobile has per-row checkboxes, no visible select-all).
3. Action + training selects.
4. Review page.
5. Confirm assign.

`MAX_BULK = 40` (`lib/manager/bulk.ts`). Select-all silently takes the first 40. A 41-man cohort cannot be assigned in one bulk pass.

**Choose fathers** on Trainings jumps to `/manager/participants?training=…#assign` (pre-fills training, still requires checkboxes + review).

**Step count (bulk):** 5–6 after login. **Severity of extra review page:** Medium. **Severity of 40 cap vs Assign remaining:** Medium (Assign remaining already solves whole-cohort).

**Friction**

- Two viable paths; the faster one is not on the first screen after login.
- Trainings page is long (catalog, waiting, cohort, hidden). Assign remaining is mid-page.
- After Assign remaining, the leader cannot see *who* got it without leaving the page.

**Severity:** High for “I am on the dashboard and need to push one module to the unit now.” Low once they have learned Assign remaining.

#### 1.3 Multiple modules

There is no “assign these three trainings to these men” action. Each training is a separate assign remaining, bulk pass, or individual select.

**Step count:** N × (1–8) depending on path.

**Severity:** Medium. Acceptable if one-click cells exist; painful today.

#### 1.4 Does bulk assignment exist?

Yes.

- Cohort: `assignTrainingToUnassigned` (Trainings).
- Selected men: `ParticipantBulkList` → `/manager/participants/bulk` → `runBulkAction` (`lib/manager/bulk-actions.ts`).
- Bulk also does mark-complete and issue-certificates. Those **should** keep a review step (type `MARK COMPLETE` / `ISSUE CERTIFICATES`). Assign should not share that tax.

**Severity of mixing assign with destructive bulk:** Medium (extra fields and an extra page for a safe action).

#### 1.5 Unnecessary confirmations, loads, fields

| Extra | Where | Needed? |
| --- | --- | --- |
| Bulk review page for assign | `/manager/participants/bulk` | No. Assign does not change progress. |
| Type-to-confirm | Bulk complete / certificates; reverse-accept | Yes, keep. |
| Training `<select>` when the person and the module are already known | Individual form; bulk when coming from “Choose fathers” | Only the unknown side should be chosen. |
| Full redirect after assign | All assign actions | Soft: flash is fine; losing the board context is not. |
| Accept / Include before first assign | Catalog | Yes. Not enrollment. Do not remove. |

#### 1.6 Mobile vs desktop

- Header nav is icon + label; Participants is one tap (same as desktop).
- Trainings cohort actions stack full-width (`min-h-11`) — usable.
- Bulk “select all” header is `hidden … md:flex`. Phone users tick names one by one. **Medium.**
- Roster row is a large tap target (good) but opens the long detail page (bad for assign).
- Reports table is `hidden md:block`; mobile gets stacked cards — still not a matrix.
- No `loading.tsx` under manager routes. Slow workspace load is a blank wait. **Low.**

---

### 2. Status visibility

#### 2.1 Who has been assigned what

| Place | What you see |
| --- | --- |
| Dashboard stats | Active count, assessments completed, sessions completed, trainings completed, pending actions. **Not** who has which module. |
| Dashboard “Open items” | Up to 8 rows. Unassigned men appear as “No training assigned”. No module names. In-progress is a session title, not a training matrix. |
| Roster | **One** `progressLabel` (`lib/manager/data.ts`): first assigned incomplete, else any in-progress, else first assigned, else “None assigned”. A man with two assigned trainings shows one string. |
| Individual | One card per catalog training: `{completed} of {total} sessions` + optional “Assigned” + percent bar. This is the only complete per-man view. |
| Trainings cohort | `{assigned} of {total}` per training. No names, no completion split. |
| Reports | Per man: one roll-up status (`not_started` / `in_progress` / `completed` across **all** assigned trainings) and titles joined with `"; "`. Filter by one training to see session `n/m` for that module. Extra Apply click. |
| Impact | Org totals. Not an assignment board. |

**Severity:** High. The roster is the natural “who has what” page and it cannot answer that question.

#### 2.2 Completion / in-progress / not-started

Defined in reports as:

- completed: all sessions in scope done
- in_progress: some sessions done
- not_started: assigned (or no assignment) and zero sessions

The desk does **not** distinguish **unassigned** from **assigned, not started** except on the individual cards (“Assigned” suffix) and the reports “None assigned” progress detail.

Roster `progressLabel` for an assigned 0/6 training: `"Title · 0/6"` — readable if you already know the title is the only assignment.

**Severity:** High at cohort level. Medium at individual level (cards are clear once you get there).

#### 2.3 Cohort vs individual

- Cohort assignment coverage: Trainings only (`assigned of total`).
- Cohort completion: Dashboard “Trainings Completed” is a single integer (sum of fully completed training cards, including unassigned completions). Easy to misread as “men done.”
- Individual completion: detail cards + current-session film/check-in/action dots.

**Severity:** High for cohort; Low for individual once opened.

#### 2.4 Login → clear status overview

Counted after a successful sign-in (one submit). Landing page is `/manager`.

| Goal | Clicks today | What you actually get |
| --- | --- | --- |
| “Are my men assigned?” | 1 (Open items may list a few unassigned) or 2 (Participants) | Incomplete. Open items capped at 8. Roster hides extra trainings. |
| “Where is the unit on Fundamentals?” | 2 (Trainings, find the row) or 2 (Reports, set training, Apply) | Assigned count **or** a filtered list — not both names and status in one glance. |
| “Where is this one man?” | 2 (Participants → name) | Clear, after a long page. |

**There is no 0-click status overview after login.** The dashboard is crowded with invite codes, companion, practice, photos, impact, reports, catalog, assessments, certificates.

**Severity:** High.

#### 2.5 Stale / incomplete / extra navigation

- Data is loaded live in `loadManagerWorkspace` (`force-dynamic` on the manager layout). Not a cache-staleness problem.
- Incomplete: roster and dashboard omit the assignment matrix that the workspace **already computed** (`trainingProgressFor`).
- Extra navigation: status and assign live on different pages (Trainings vs Participants vs Reports vs detail).

**Severity:** High (information architecture), not data freshness.

---

### 3. Combined assign + see-status loop

Typical high-tempo loop: assign Fundamentals to the unit, confirm it stuck, assign the next man who still needs Coming Home Present.

**Today**

1. Dashboard (no board).
2. Trainings → Assign remaining.
3. Same page flash “Assigned to N.” Counts update after redirect. **Names still absent.**
4. Participants to see labels. Each label is one training.
5. Optional: open a man to confirm the card says Assigned.

Context switches: 2–3 routes, 2 full reloads, no place that is both the assign control and the status grid.

Rapid repeat:

- Second module: scroll Trainings again, Assign remaining again. Workable.
- Mixed subset (3 of 12 men): bulk + review page each time, or open three detail pages.

**Severity:** High.

---

### 4. Information density and clarity

**Understandable today**

- Individual percent + session fraction.
- “Assign to N remaining” is plain language.
- Review badges: Pending / Accepted / Declined.

**Forces extra reading**

- Dashboard five tiles compete with the real question.
- “Current Training” column is one string; looks like the whole story.
- Reports roll-up status: a man done with training A and not started on B reads as in_progress. Correct for a person-level export; wrong as an ops board.
- Empty catalog vs empty cohort vs empty roster are separate empty states and are fine.
- No manager `loading.tsx`.

**Severity:** Medium (density), High (false completeness of one label).

---

### 5. Permission and scoping

**Assign**

- UI only lists the manager’s groups and members (`loadManagerGroups` filters `manager_id`).
- `assignTrainingToFather` requires `group_members` for that father; review is for **his** `group_id`.
- Bulk skips ids that fail `manages_father` (“Not in your group.”).
- RLS: managers cannot insert assignments for other orgs.

**Status**

- Workspace, reports, and detail 404 (`loadManagedParticipant` returns null → `notFound()`) if the father is not in the manager’s groups.

**Gap (not a leak)**

- A manager with two groups sees both on one roster. That is scoped to *his* orgs, not the platform. Column/group labels already exist when `groups.length > 1`.

**Severity:** None for security. Do not loosen. Preserve `manages_father` and `manager_id` filters on every new control.

---

### 6. Severity map

| ID | Finding | Severity |
| --- | --- | --- |
| A1 | Individual assign buried; 6+ clicks after login | High |
| A2 | Bulk assign adds a review page with no confirm token | Medium |
| A3 | Whole-cohort assign is good but not on the first screen | High |
| A4 | No multi-module assign | Medium |
| A5 | Bulk select-all missing on mobile; 40-person cap | Medium |
| S1 | Roster shows one progress label, not who-has-what | High |
| S2 | Dashboard has no assignment/status board | High |
| S3 | Trainings row is assigned/total only | Medium |
| S4 | Login → clear overview is not possible | High |
| L1 | Assign and status live on different pages | High |
| D1 | Dashboard visual noise before the job | Medium |
| P1 | Org scoping is correct | — |

No **Blocker** in the sense of “cannot assign.” The adoption risk is death by extra clicks.

---

## Phase 2 — Minimal high-tempo experience

Do not add a new desk, role, table, or settings screen. Reuse `training_assignments`, `assignTrainingToFather`, `assignTrainingToUnassigned`, and `runBulkAction`.

### Target maximum steps (training already accepted, manager already signed in)

| Job | Target | How |
| --- | --- | --- |
| One module → one person | **1 click** | Assign on that man’s cell for that training |
| One module → group / remaining | **1 click** | Assign remaining on Dashboard, Trainings, or the board column |
| See overall status for his men | **0 extra clicks** after login | Status strip on `/manager`; full name × training board on Participants |

Login itself stays one form submit. “0 extra clicks” means the landing page answers the status question.

### UI / flow changes (only these)

1. **Dashboard status strip** (top of `/manager`, after flash)  
   Per assignable training: assigned/total, not started, in progress, done, remaining.  
   One **Assign to N remaining** when N > 0. Link **Open board** → `/manager/participants#status`.

2. **Participants assignment board** (`#status`)  
   Rows = his men. Columns = trainings he can assign.  
   Cells: Assign (unassigned + allowed) · Not started · `completed/total` · Done.  
   Column header repeats Assign remaining.  
   Sit this **above** quiet-nudge and bulk. The roster list can stay for profile / last activity / checkboxes.

3. **Skip the bulk review page when the action is assign**  
   Selected men + training + **Assign now** posts `runBulkAction` from the roster.  
   Keep `/manager/participants/bulk` for mark-complete and certificates.

4. **Individual desk**  
   Put training cards and assign immediately under the name.  
   Unassigned card gets a one-click Assign (no extra dropdown when that card *is* the training).

5. **Trainings cohort row**  
   Add the same not-started / in-progress / done counts next to assigned/total. Keep Assign remaining.

### Bulk

- Assign remaining remains the whole-cohort path (no 40 cap).
- Selected-subset assign drops one page and one decision.
- Do not add multi-training assign in this pass. Repeating a 1-click cell is enough.

### What to remove or stop leading with

- Do not lead the Participants page with bulk-as-the-assign-story.
- Do not send “Choose fathers” into a form that still requires a review page; send it to the board with the training pre-selected as a column highlight if cheap, otherwise `#status`.
- Do not add Impact/Reports as the daily status loop. Leave those for hand-up reporting.

### Out of scope (on purpose)

- Accept / Include gate.
- Type-to-confirm on complete / certificates / reverse-accept.
- New facilitator role, participation modes, skill-use, PDF redesign.
- Touching `main`.

---

## Phase 3 — Implementation notes

Implemented on `cursor/assignment-visibility-tempo-7c78`. Helpers live in `lib/manager/assignment-status.ts`. UI: `components/manager/assignment-status-strip.tsx`, `components/manager/assignment-board.tsx`. Return path after assign is `dashboard` | `participants` | `trainings` | `detail` so the leader stays in the loop.

---

## Phase 4 — Verification

### New step counts (training already accepted)

Counted after sign-in. Landing page is `/manager`.

| Job | Before | After |
| --- | --- | --- |
| One module → one person | 6–8 clicks + long detail scroll | **1 click** on that man’s Assign cell on the board (2 if the leader is still on Dashboard and taps Open names first) |
| One module → remaining / cohort | 3 clicks (Trainings → find row → Assign remaining) | **1 click** on Dashboard Assign remaining |
| See overall status | No clear overview. 2+ clicks still left a single progress label | **0 extra clicks** — Dashboard strip shows assigned / not started / in progress / done. **1 click** (Open names) for the name × training board |

Assign → see-status loop: Assign remaining on the strip reloads `/manager#status` with the same counts updated. A cell assign reloads `/manager/participants#status` with that cell flipped to Not started. No second app area.

### Experience

**Rehab director (Org Manager):** After login the first card is the unit’s assignment status. If two men still need Fundamentals, one tap assigns both. Opening names shows every man against every assignable training.

**Military leader:** Same strip, same board. Mixed subsets still use checkboxes + Assign now (no review page). Whole-unit push stays uncapped via Assign remaining.

### Organization scoping

Unchanged and tightened:

- Workspace still loads `groups.manager_id =` the signed-in manager only.
- Board columns only include trainings assignable to **his** groups (`isTrainingAssignable` + that group’s review).
- Assign remaining now skips men whose group has not accepted the training (does not fail the batch on another org).
- Cell assign still goes through `assignTrainingToFather` + `manages_father` RLS.

### Files changed

- `docs/ORG-MANAGER-ASSIGNMENT-TEMPO-AUDIT.md`
- `lib/manager/assignment-status.ts`
- `lib/manager/return-path.ts`
- `lib/manager/actions.ts`
- `lib/manager/training-actions.ts`
- `components/manager/assignment-status-strip.tsx`
- `components/manager/assignment-board.tsx`
- `components/manager/participant-bulk-list.tsx`
- `app/(manager)/manager/page.tsx`
- `app/(manager)/manager/participants/page.tsx`
- `app/(manager)/manager/participants/[id]/page.tsx`
- `app/(manager)/manager/trainings/page.tsx`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/he.ts`
- `tests/manager-assignment-status.test.ts`
- `tests/manager-return-path.test.ts`

### What is robust vs what needs live tempo testing

**Robust in this tree**

- Status math (unassigned ≠ not started; other-org men excluded).
- Return paths after assign.
- Typecheck and unit tests for board/scoping/return path.
- Permissions still use the existing mutation + RLS path.

**Needs a real Org Manager under time pressure**

- Whether the Dashboard strip is visible enough above companion / notes / invite on a phone.
- Whether a 12–20 man roster × 4 trainings stays scannable; horizontal scroll on desktop.
- Whether “Assign now” without a review page feels safe enough for subset assigns.
- Whether leaders still wander into Reports/Impact for daily status out of habit.
- Live assign remaining against Pilot seats (`manager@nwa`) to confirm flash + board update in one breath.

