# Lightweight outcome signals beyond completion

Audit of the **clean-pilot** desk and father path. Primary readers: Org Managers (rehab directors and other leaders) who need a credible signal that skill work is used, not only marked complete. Fathers must be able to report in seconds. Facilitators are not a separate role in this product.

The goal is one or two simple, non-clinical signals. Not an assessment instrument, scored outcomes engine, or therapy tool.

Evidence is from `origin/clean-pilot` at the start of this pass. No `main`.

---

## Phase 1 — Current-state audit

### 1. Existing completion data

Session completion is three required checkboxes on `session_progress` (`supabase/migrations/20260817025510_pilot_core_schema.sql`, `lib/father/types.ts` `isSessionComplete`):

| Field | Meaning |
| --- | --- |
| `film_completed` | Watched the film |
| `checkin_completed` | Answered the skill-check MCQ |
| `action_completed` | Finished the Action step |
| `status` | `not_started` / `in_progress` / `completed` |
| `completed_at` | Set when all three are true |

Training assignment (`training_assignments`) is presence-only. No use field. Certificates (`certificates`) store serial, dates, and PDF path. Issued only when every session is complete (`lib/manager/mutations.ts`). No skill-use field.

**Father sees** (`/father`, `/father/trainings`, session chrome): `{completed} of {total} complete`, session dots marked “Done”, streak weeks counted when a session finishes, certificates earned.

**Org Manager sees** (`/manager`, `/manager/participants`, `/manager/reports`, `/manager/impact`):

- Dashboard: Active Participants, Assessments Completed, Sessions Completed, Trainings Completed, Pending Actions
- Assignment board: Not started / `n/m` / Done
- Participant detail: `{completed} of {total} sessions`, Film / Check-in / Action step dots, certificate-ready
- Reports CSV: Name, Group, assignments, completion status, session progress (`3/9 sessions`), certificate serials, last activity (`lib/manager/reports.ts`)
- Reports PDF: Name, Status, Assignments, serials, last activity — no use column (`lib/manager/report-pdf.ts`)
- Impact: enrolled, started (any step), completed one session, fully completed a training, certificates, 30-day activity (`lib/manager/impact.ts`)

Companion and attention use last activity, stall session number, and certificate-ready. Completion and quiet only.

**Severity:** High. Completion is solid and visible. It is the only org-facing evidence that work happened.

---

### 2. Post-completion and skill-use signals today

The product already has a skill *practice loop*. It is not an org-facing outcome signal.

#### Action commitment (`action_commitments`)

`supabase/migrations/20260818120000_action_commitments.sql`, UI `components/father/action-loop.tsx`.

| Step | Copy | Write |
| --- | --- | --- |
| Commit | “When will you use it?” Tonight / This weekend / … | `intention_label`, `intention_at` |
| Do | “I did it” | `completed_at` **and** `session_progress.action_completed` |
| Finish | “Optional note” / “Optional. One line.” | `outcome_note` (≤140), `closed_at` |

“I did it” is the last **completion** checkbox. A count of “I did it” equals a count of completed sessions. It does not prove use after the man left the screen.

`outcome_note` is the only extra field. Comment in SQL: *“Optional one-line behavioral report. Visible to the father only.”* RLS is own-walk only (`20260818210000_leader_practice.sql`). Managers cannot read father rows. UI never shows the note to an Org Manager.

#### Action reminder

Notification type `action`: “One thing to try” / “You said you would {summary}. Still on for it?” (`lib/notifications/copy.ts`). Fires at the named moment, while the loop is still in “do.” It is a nudge to finish the Action step, not a post-completion use check.

#### Check-in answers

`session_progress.checkin_answers` stores the MCQ (`q1`). That is a teaching check, not use in life. Optional notes constants exist (`CHECKIN_NOTE_KEY`) but `SessionCheckinFields` does not render a notes field.

#### Done page

`/father/sessions/[sessionId]/done` → `SessionCloseoutView`. Copy: “Session {n} is in.” Next session. Continue / Home. No “did you use this?”

#### Leader notes, cohort notes, nudges

Staff-authored. Not father skill-use. Private notes never go to the father. Nudges are “session still open.”

#### Streaks

`father_streaks` counts **finished sessions**. Father-only. Not skill use.

#### Facilitator

Roles are `father | manager | reviewer | admin` (`lib/auth/roles.ts`). There is no facilitator role. Org Manager = Leader. Manager self-practice (`/manager/practice`) walks the same Action loop on the manager’s own rows.

**Severity**

| ID | Gap | Severity |
| --- | --- | --- |
| S1 | Org Manager surfaces are completion-only | **High** |
| S2 | “I did it” is required for completion, so it is not evidence beyond a checkbox | **High** |
| S3 | `outcome_note` exists and is father-only; unused as an org signal | **High** (visibility), Low (capture already exists) |
| S4 | Done page and Home have no post-completion use prompt | **Medium** |
| S5 | Check-in / `action_note` / `session_note` are dead or teaching-only | **Low** for this pass (do not revive as a questionnaire) |
| S6 | No facilitator capture path | **Low** — managers already have private notes; do not invent a role |

---

### 3. Data model readiness

**Ready without a new product**

- `session_progress` already has manager SELECT (and UPDATE) for managed fathers. `loadManagerWorkspace` already `select("*")` on those rows. A nullable flag/timestamp on this table is the lightest attach point and works even when a leader marked the training complete (no `action_commitments` row).
- `action_commitments.outcome_note` already stores an optional line. Extending that table would miss manager-marked completes and would require new manager RLS on a table that was written as father-only.

**Do not reuse as the org signal**

- Keystone / custom assessments (scored, optional, parallel track)
- Streaks
- Certificates
- Check-in MCQ

**Severity:** Low as a schema problem. High as a *wiring* problem. One or two columns on `session_progress` are enough.

---

### 4. Manager visibility after completion

After a man finishes a session, an Org Manager can see that the session is done and, later, that a certificate is ready. He cannot see:

- Whether the man used the skill at home
- The optional outcome note
- The check-in choice

Reports and Impact do not have a use column. Privacy copy says the leader sees “training progress, assessment responses” — it does not promise session notes, and the UI does not show them.

**Severity:** High for rehab and military credibility. Medium for church (nice, not load-bearing).

---

### 5. Participant and facilitator friction

Today, anything beyond completion is either required (“I did it”) or hidden (optional one-liner, then gone). There is no later, one-tap prompt. A facilitator would have to write a private manager note in free text, with no shared language and no roll-up.

Empty states after completion point at the *next session*, not at use.

**Severity:** Medium. Capture can stay at seconds if we add one tap. Do not add a form.

---

### 6. Overreach risk

Session copy is instructional, not clinical: “one skill,” “skill check on what the film taught,” “Optional. One line.” Notification copy already forbids `therapy`, `rehab`, `treatment`, and similar (`lib/notifications/copy.ts`). Terms say assessments are not a clinical instrument.

Keystone (“Primary Edge,” Likert) is a separate optional assessment. It must stay off this path.

**Severity:** Low on current session language. **High** if this pass added scores, scales, “outcomes,” “applied intervention,” or a required questionnaire.

---

### Severity map

No **Blocker**. The desk works. Rehab and military leaders cannot tell completion from use.

---

## Phase 2 — Minimal viable signal

### One signal

**“He used this skill”** — optional self-report after the session is already complete.

Not a score. Not required to complete or to get a certificate. Not the existing “I did it” checkbox.

### Who

The father. One tap.

No new facilitator role. Org Managers keep private notes for anything they observe. Do not ask staff to fill a second form.

### When

1. **Immediately (optional):** on the session done page. Does not block Continue / Home.
2. **Follow-up (optional):** on Home, for the most recently completed session that has no answer, once at least 12 hours have passed. So a man who taps Home right after closeout is not asked twice in the same minute. “Not yet” dismisses that session. Completing a later session can raise a new card.

No new email or push. The existing Action reminder stays a pre-completion nudge.

### Storage

On `session_progress` (already org-scoped, already loaded for the desk):

- `skill_use` text, null or `used` | `later`
- `skill_use_at` timestamptz

`used` is the only count that appears to leaders. `later` means “don’t ask again for this session.” He can still change `later` → `used`. He cannot take back `used`.

Missing column or null = no report. Completion unchanged.

Do not send `outcome_note` to the manager. That line can be personal; it was stored as father-only. The tap is enough for credibility without sharing the text.

### Manager view

- Dashboard: one number, **Skills used** (count of `used` in the organization).
- Participant detail: on each training card, `{n} used` next to session counts. No note text.
- Reports table + CSV: **Skills used** as a count. PDF keeps the same columns; the assignments cell can mention the count so the landscape page does not gain a sixth squeezed column.

Same organization scoping as the rest of the desk (`manages_father` / workspace father ids). Manager practice rows are not in that set.

### Language

| Voice | Copy |
| --- | --- |
| Father | “Did you use this skill?” / “I used it” / “Not yet” / “You marked that you used this.” |
| Manager | “Skills used” / “{n} used” / “He used this skill on {n} of {completed} sessions.” |
| Avoid | outcome, assessment, score, progress %, applied, intervention, therapy, required, overdue |

### Shared vs varied

Shared: assignment, completion, certificates, mute, reminders, Keystone.  
Varied: this one optional tap and the count leaders see.

### Out of scope

- Questionnaires, scales, or scored “outcomes”
- Surfacing `outcome_note` or check-in answers
- Facilitator role or observed-practice form
- Changing what “completed” means
- Touching `main`
- New notification type

---

## Phase 3 — Implementation notes

Implemented on `cursor/skill-use-signals-7c78`. Helpers in `lib/father/skill-use.ts`. Columns `session_progress.skill_use` (`used` | `later` | null) and `skill_use_at`. Completion, certificates, and assignment are unchanged.

Pilot (`koeplcybddrvbliuepsy`) has the columns. Existing rows stay null until a father taps.

---

## Phase 4 — Verification

### Father

1. Finishes film, check-in, and Action as before. “I did it” still completes the session.
2. On the done page: optional **Did you use this skill?** / **I used it**. Continue and Home still work if he skips.
3. Twelve hours later, Home can show the same question once for the most recent unanswered session, with **Not yet**. That dismisses the card for that session. He can still tap **I used it** later. He cannot take back **I used it**.
4. No new email. No score. No required form. The optional Action one-liner stays father-only.

### Org Manager (rehab director / other leader)

- Dashboard: **Skills used** next to Sessions Completed. Count of `used` taps in the organization. Not a percentage. Not “later.”
- Participant detail: `{n} used` on each training card that has completed sessions.
- Reports table and CSV: **Skills used** as a count. PDF keeps five columns; the assignments cell adds “· n used” when the count is above zero.
- Same group scoping as the rest of the desk. Manager practice taps do not land in org totals.

### What stays non-clinical

Copy is “Did you use this skill?” / “I used it” / “Skills used.” No outcome, assessment, score, intervention, or required questionnaire. Keystone is untouched. `outcome_note` is still not shown to leaders.

### Files changed

- `docs/ORG-MANAGER-SKILL-USE-SIGNALS-AUDIT.md`
- `supabase/migrations/20260819200000_session_skill_use.sql`
- `lib/father/skill-use.ts`, `lib/father/types.ts`, `lib/father/data.ts`, `lib/father/actions.ts`
- `components/father/skill-use-card.tsx`, `components/father/session-closeout.tsx`
- `app/(father)/father/page.tsx`
- `app/(father)/father/sessions/[sessionId]/done/page.tsx`
- `app/(manager)/manager/practice/sessions/[sessionId]/done/page.tsx`
- `lib/manager/types.ts`, `lib/manager/data.ts`, `lib/manager/reports.ts`, `lib/manager/report-pdf.ts`
- `app/(manager)/manager/page.tsx`
- `app/(manager)/manager/participants/[id]/page.tsx`
- `app/(manager)/manager/reports/page.tsx`
- `lib/i18n/messages/en.ts`, `lib/i18n/messages/he.ts`, `lib/i18n/flash.ts`
- `tests/skill-use.test.ts`, `tests/nudge-panel.test.ts`, `tests/certificate-desk.test.ts`

### Robust now

- One optional tap, stored on the progress row the desk already loads.
- Counts are org-scoped. `used` cannot be downgraded to `later`.
- Missing/unknown values read as no report. Completion still works if nobody ever taps.
- Typecheck and 160 unit tests pass.

### Still needs live users

- Whether fathers will tap on closeout, wait for Home, or skip both.
- Whether “I used it” is credible enough for rehab and military leaders, or whether they will want a facilitator check later.
- Whether church leaders find the new Dashboard number useful or noisy.
- Hebrew tone with Israeli fathers and leaders.
- Whether 12 hours is the right gap before Home asks again.
