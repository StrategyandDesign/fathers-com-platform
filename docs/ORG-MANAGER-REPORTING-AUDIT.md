# Org Manager reporting audit (rehab directors)

**Role mapping:** In this product, rehab directors are **Org Managers** (`manager` / UI label Leader). This audit is only about that role. Father participants and Super-admin are out of scope except where they affect what a manager can see.

**Line:** clean-pilot. Evidence is from `cursor/manager-reporting-simplicity-7c78` (branched from the clean-pilot UX refinements tree).

**What a director needs to hand upward:** who is in the cohort, who was assigned what, who finished, when, and a file they can attach to a funder or licensing packet. Not clinical outcomes.

---

## 1. Data available to Org Managers

### Current state

Scoping is **manager → groups → members → father rows**. The single loader is `loadManagerWorkspace(managerId)` in `lib/manager/data.ts`.

| Step | Query | File |
|---|---|---|
| Groups this manager owns | `groups` where `manager_id = managerId` | `lib/manager/data.ts` 41–50 |
| Roster | `group_members` where `group_id IN` those groups | same, 58–62 |
| Identity | `profiles.id, full_name, avatar_url` for those father IDs | 67–68 |
| Keystone | `father_profiles`, `father_profile_drafts` | 70–81 |
| Session work | `session_progress.*` | 83–84 |
| Assignments | `training_assignments.*` (`assigned_by`, `assigned_at`) | 86–87 |
| Certificates | `certificates.*` (`serial_number`, `issued_at`, `issued_by`) | 88–90 |
| Catalog | `trainings.*`, `sessions.*` (not org-scoped; progress still is) | 92–93 |

RLS matches the app: `internal.is_manager_of_group` / `internal.manages_father` in `supabase/migrations/20260817025510_pilot_core_schema.sql` and policies in `supabase/migrations/20260817033531_pilot_rls_policies.sql`. A manager cannot read another org’s session, assignment, or certificate rows.

Derived in memory:

- `trainingProgressFor(fatherId)` — sessions completed / total, assigned flag, certificate (`lib/manager/data.ts` 129–167)
- `ParticipantRow.lastActivity` — **max of join date, Keystone date, session `completed_at`, assignment `assigned_at`, certificate `issued_at`** (209–215)
- Dashboard `summary` — enrolled count, lifetime sessions completed, training-completion **count** (can exceed enrolled), pending actions (271–277)

### Stored but not shown on reports

| Field | Stored | Visible on `/manager/reports` or export? |
|---|---|---|
| Father UUID | `profiles.id` / `group_members.father_id` | No |
| Assignment date | `training_assignments.assigned_at` | No |
| Assigned-by | `training_assignments.assigned_by` | No (UUID only; no name lookup) |
| Per-session `completed_at` | `session_progress.completed_at` | Folded into “last activity” only |
| Certificate issued-at | `certificates.issued_at` | No (serial only, concatenated) |
| Group | `groups.name` | Preview subtitle / CSV only; not PDF |
| Keystone `profileStatus` | computed | Loaded onto `ReportRow` then **never rendered or exported** |
| Email | `auth.users` | Intentionally omitted; RLS does not give leaders auth emails (`manager.reports.lead`) |

### Gaps

- Reports are **one row per man**, with every training jammed into one cell. A director cannot sort “who finished Fundamentals.”
- Date filter is last activity **including the day they joined**, so a join looks like participation.
- No per-training completion date.
- No participant ID for a paper trail without using a name collision.
- Multi-group managers get a merged roster with **no group filter**.

**Severity:** High for assignment-level evidence and date-filter trust. Medium for missing ID / assigned-at / group filter. Low for unused Keystone column and omitted email (email omission is correct under RLS).

---

## 2. Current reporting / dashboard surfaces

| Route | What it shows | Loader |
|---|---|---|
| `/manager` | Tiles: Active Participants (enrolled), Assessments Completed (custom assessments only), Sessions Completed (lifetime), Trainings Completed (assignment count), Pending Actions. Cards to Impact and Reports. | `app/(manager)/manager/page.tsx`, `loadManagerWorkspace` |
| `/manager/reports` | Filter form + preview table + CSV/PDF | `app/(manager)/manager/reports/page.tsx`, `loadManagerReport` |
| `/manager/impact` | 30-day snapshot: enrolled, started, one session, fully completed, certs, “currently active” | `lib/manager/impact.ts` |
| `/manager/impact?tab=compare` | Group vs group or period vs period | `lib/manager/compare.ts` |
| `/manager/participants` | Roster + certificate desk | not an export |
| `/manager/participants/[id]` | Per-man progress | not an export |
| `/manager/assessments*` | Assessment roster counts | not training completion |

**Auth:** `requireRole("manager")` in `app/(manager)/layout.tsx`. Login lands on `/manager` (`lib/auth/roles.ts`).

**Glance quality**

- Dashboard tiles are operational, not a report. “Active Participants” means **enrolled**, while Impact “Currently active” means **last activity in 30 days**. Same word, different math.
- “Trainings Completed” on the dashboard **counts trainings**, Impact “Fully completed” **counts men** who finished at least one. A director comparing the two will not trust either.
- Reports table is readable for a small group and fails as soon as a man has two assignments.

**Individual detail:** name on the reports table links to `/manager/participants/{id}`. That is one extra click per man and is not in the export.

**Empty states:** reports and impact both have empty/no-match states (`EmptyState`). Good.

**Nav friction:** Reports is in the sidebar (`components/layout/app-nav.tsx` 103–108) but **not** in the desktop header pills (`components/layout/manager-header-menu.tsx` — Dashboard + Impact only).

**Severity:** High for label collisions and concatenated assignments. Medium for header-nav miss.

---

## 3. Export capabilities

### Reports — `GET /api/manager/reports/export`

`app/api/manager/reports/export/route.ts`

- Auth: `requireRole("manager")`
- Formats: `csv` or `pdf`
- Filters: `training_id`, `status`, `from`, `to` (same as the page)
- Rate limit: 20 / 5 minutes
- Filename: `fathers-com-report-YYYY-MM-DD.{csv|pdf}`

**CSV columns today** (`lib/manager/reports.ts` `rowsToCsv`):

Name · Group · Training assignments (semicolon list) · Completion status (rolled up) · Session progress (concatenated) · Certificate serials (concatenated) · Last activity

No generated-at, no organization line, no field definitions, no participant ID, no assigned-on, no completed-on, no per-training status.

**PDF columns today** (`lib/manager/report-pdf.ts`):

Name · Status · Assignments · Certificate serials · Last activity

Has a generated date in the header. Drops Group and session fractions. Title: “Fathers.com Leader Report.”

**Scoping:** export calls `loadManagerReport(user.id, filters)` — same workspace as the page. Another org’s men cannot appear.

**Date range:** yes, but it filters **last activity including join**, not “completed in this window.”

### Impact — `GET /api/manager/impact/export`

PDF only. Snapshot numbers, not a roster. No CSV. No date-range picker (fixed 30 days). Useful as a cover sheet, not as the hand-up list.

### Missing for a director

- One row per man × training
- Status, sessions completed/total, assigned on, completed on, serial, issued on
- Generated-at + definition of “completed”
- Organization name on the CSV (PDF has a date; CSV does not)

**Severity:** High. The file they download is the product.

---

## 4. Trust and credibility

| Issue | Evidence | Severity |
|---|---|---|
| Dashboard “Active” ≠ Impact “Currently active” | `summary.activeParticipants` is roster size; `impact.activeParticipants` is 30-day last-activity | High |
| Dashboard “Trainings completed” ≠ Impact “Fully completed” | Count of finished trainings vs count of men | High |
| Date filter includes join | `lastActivity` includes `member.joined_at` | High |
| Preview and CSV share rolled-up rows | Concatenated assignments cannot be checked against a single module | High |
| CSV has no generated-at or definitions | `rowsToCsv` is header + data only | High |
| Keystone status computed then dropped | `ReportRow.profileStatus` unused | Low |
| Totals on reports (“N of M participants”) | Honest about filter size; does not explain status rules | Medium |

A manager **can** click through to a participant page to verify one man. They cannot verify the export against a training without unpacking concatenated cells.

Placeholders: empty states are real, not fake zeros. Impact shows 0% math on an empty org. Fine.

---

## 5. Friction (login → summary → export)

Today, after login (`/login` → `/manager`):

1. Land on a crowded dashboard. Reporting is a card below companion, reviews, stats, attention, photos.
2. Click **Open reports** (or sidebar Reports). Header pills skip Reports.
3. Land on `/manager/reports`. Must read the date-filter caveat in the lead.
4. Optionally set filters, click **Apply filters**.
5. Click **Download CSV** or **Download PDF**.

**Clicks to a file:** 2 (dashboard card → CSV) if they skip filters; 3–4 if they use the header-less path and apply filters. The file they get is still not boss-ready.

Dead ends: none. Unclear labels: “Active,” “Last activity,” “Trainings completed.”

---

## 6. Institutional needs vs today

| Director must report | Today | Gap |
|---|---|---|
| Participation rate (who is in the cohort) | Enrolled count on dashboard/impact | Label says “Active” |
| Completion counts by module | Concatenated; Impact has per-training counts but no roster export | No assignment-level file |
| Individual progress | Preview table + participant page | Not export-ready |
| Time-bound activity | Date filter on last activity including join; Impact 30-day trends | Cannot say “completed in August” |
| Evidence packet (name, module, status, dates) | Partial CSV | Missing ID, assigned-on, completed-on, definitions |

**Still missing for “hand this to my boss”:** assignment-level rows, honest date semantics, generated-at + definitions, one-click download from the dashboard, counts that match the file.

Out of scope (and should stay out): clinical outcomes, skill-use beyond completion, email, a fifth role, a new warehouse.

---

## 7. Phase 2 design (minimal)

Keep Impact as the 30-day cover snapshot. Make **Reports** the evidence packet.

1. **One row per assignment** (or one “None assigned” row). Preview, CSV, and PDF use the same rows.
2. **Date filter = last program activity** (assignment, session completion, certificate). Join date is enrollment, not participation.
3. **CSV + PDF fields:** Name, Participant ID, Group, Training, Status, Sessions completed, Sessions total, Assigned on, Completed on, Certificate serial, Certificate issued, Last program activity. CSV also repeats Generated at UTC and Organization on every row, plus a short `#` definition block.
4. **Optional group filter** so a multi-group director can export one cohort. Must be one of *their* groups.
5. **Summary tiles on Reports** that count those same rows: men, completed, in progress, not started.
6. **Dashboard:** same three numbers + **Download CSV** (unfiltered, their org only) + Open reports. Put Reports in the header pills.
7. **No new tables, RPCs, or roles.** Same `loadManagerWorkspace` scoping.

**Status definition (print it on the export):**

- Completed: every session in that training is finished
- In progress: at least one session finished, not all
- Not started: assigned (or listed) with zero sessions finished, or none assigned

---

## 8. Phase 3–4 — what landed

Implemented on `cursor/manager-reporting-simplicity-7c78`. No schema change. Same `loadManagerWorkspace` scoping (`groups.manager_id` → members → father rows). A `group_id` that is not one of the manager’s groups returns no rows and `"That group is not yours."`

### New login → export path

1. Sign in as Org Manager → `/manager`
2. Reports card shows men / completed / in progress (same math as the file)
3. **Download CSV** (one click) or header **Reports** → **Download CSV**
4. Optional: filter by group, training, status, or program-activity dates, then download again

### Files changed

- `lib/manager/reports.ts` — assignment-level builder, date semantics, CSV packet
- `lib/manager/report-pdf.ts` — matching columns + definition line
- `app/api/manager/reports/export/route.ts` — passes organization and filters into the file
- `app/(manager)/manager/reports/page.tsx` — tiles, definitions, group filter, assignment table
- `app/(manager)/manager/page.tsx` — report strip + Download CSV; dashboard tile says Enrolled
- `components/layout/manager-header-menu.tsx` — Reports pill
- `lib/i18n/messages/en.ts`, `lib/i18n/messages/he.ts`, `lib/i18n/flash.ts`
- `tests/manager-reports.test.ts`

### Export fields now

Name, Participant ID, Group, Training, Status, Sessions completed, Sessions total, Assigned on, Completed on, Certificate serial, Certificate issued, Last program activity, Generated at UTC, Organization. CSV opens with `#` definitions.

### Still needs live testing with directors

- Whether they want “none assigned” rows in the packet or only assigned trainings
- Whether Participant ID (account UUID) is enough without an org-internal ID
- Assigned-by **name** (we store the assigner UUID only)
- Timezone of “program activity” dates (UTC day)
- Whether Impact’s 30-day “currently active” still confuses people next to Enrolled (Impact was left alone on purpose)
- Real cohort size and Excel comfort with the `#` definition block
