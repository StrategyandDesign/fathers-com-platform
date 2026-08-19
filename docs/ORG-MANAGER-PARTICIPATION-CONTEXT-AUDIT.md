# Mandatory vs voluntary context

Audit of the **clean-pilot** desk and father path. Primary users: Org Managers in rehab and military settings (more mandatory) and leaders in church / religious settings (more voluntary).

The same assignment, status, and reminder tools serve both. This pass asks whether language, reminders, and light accountability signals respect that difference without splitting the product.

Evidence is from the tree this pass started on (`cursor/assignment-visibility-tempo-7c78`, clean-pilot line). No `main`.

---

## Phase 1 — Current-state audit

### What exists today

There is **no participation context** on an organization, cohort, or assignment.

`public.groups` has name, invite code, manager, optional `code` and `locale`. Nothing records whether assigned training is expected or invited (`supabase/migrations/20260817025510_pilot_core_schema.sql`, `20260817180000_org_locale.sql`).

A leftover comment in `supabase/migrations/20260810160000_delivery_modes_and_locale.sql` mentions `completion_mode` on an older `certificate_courses` table (graded final vs checkpoint). That is **not** this product’s group desk, and it is not wired to copy or reminders.

Manager account (`/manager/account`) can change photos and display title. It cannot set tone, reminder presence, or consequence framing.

Default if nothing is set: the app already behaves as one voice. That voice is **invitation-first** in anything a father reads, and **desk/ops** in anything a leader reads.

---

### 1. Language and microcopy

#### Father-facing (invitation-first)

| Surface | Route / file | Exact copy | Assumption |
| --- | --- | --- | --- |
| Home empty | `/father`, `father.home.nothingAssignedBody` | “Your leader will open your first training. We will let you know.” | Passive wait. Fine in church. Weak if the man is in a required program and thinks nothing is expected of him. |
| Trainings empty | `/father/trainings` | “Your leader has not assigned a training yet. It will appear here when they do.” | Same. |
| Start hold | `/father/start/hold` | “Your leader has not assigned a training yet.” / “You will get a reminder when your first one is ready.” | Invitation + optional reminder. |
| Start reminder opt-in | `father.start.reminderBody` | “Skip it if you do not want one.” | Voluntary opt-in. Right for church. Easy to skip in a mandatory house. |
| Weekly reminder pref | `account.sessionRemindersHint` | “One message a week if your next session is open… You can turn this off.” | Father can silence the only automatic cadence. |
| Leader notes pref | `account.leaderEncouragementHint` | “When your leader posts a short note. You can dismiss it on Home.” | Dismissible. Correct for voluntary. Soft for mandatory. |
| Assessment | `father.home.profileReminder` | “Optional. Four parts…” | Explicitly optional. Shared and correct (Keystone is not the assigned film). |

#### Leader notes and emails (strongly voluntary)

Hard-coded English in `lib/manager/nudges.ts` (`NUDGE_TEMPLATE_COPY`):

- Continue: “A calm note that the next session is still here. **No rush.**” / “Whenever you’re ready.” / “Nothing expired.”
- Encouragement: “Invite him back when it fits.” / “**No catch-up required.**”
- Welcome back: “Adult and unhurried.” / “Sign in when you’re ready.”

The manager UI previews (`manager.nudge.*Preview`) are milder: “The next session is still open.” The **email template bodies** are the leak if that path is used.

Live father notifications (`lib/notifications/copy.ts`) are also invitation-first:

- Tier A: “Your first session is open **when you are ready.**”
- Tier B: “Pick it back up **when you can.**”
- Tier C: “Your training is still here **whenever you want it.**”
- Default leader note: “There is a session waiting **when you have a few minutes.**”
- Weekly: “Your next session is ready” / “This is your weekly reminder.” (neutral)
- New assignment: “New training from {leader}” + session count. (neutral, slightly institutional)

`notificationCopy` forbids father-facing words including `late`, `failing`, `rehab`, `unit`, `days` (`lib/notifications/copy.ts`, `tests/nudge-panel.test.ts`). There is **no overdue copy** in the father channel, by design.

#### Manager-facing (desk / ops)

| Surface | Copy | Assumption |
| --- | --- | --- |
| Dashboard lead | “Assign work and see who has it.” | Institutional verb. Fine in rehab/military. Heavy in a church if that is the first sentence. |
| Assignment board | Assign / Not started / `n/m` / Done | Shared and factual. |
| Quiet panel | “These men have been quiet.” / “Assigned {n} days ago. Not started.” | Accountability without punishment. Reads as surveillance in a voluntary group if it is the loudest card. |
| Companion | “{n} assigned seats have no recent activity.” / “Stalled on Session {n}” | “Seats” and “stalled” are program language. |
| Attention | “No training assigned” | Ops, not moral. Shared. |
| Reports | not started / in progress / completed | Shared. No late. |

**Severity**

- Father “no rush / whenever you want it / no catch-up required”: **High** for rehab and military. Undermines a program that expects completion.
- Manager “Assign work” / “assigned seats” / “stalled”: **Medium** for church. Usable, but cold.
- Empty-state “waiting on your leader”: **Medium** for mandatory (implies the man has no part yet). **Low** for church.

---

### 2. Status labels and visual framing

Shared labels after the assignment-tempo pass:

- Unassigned (em dash + Assign)
- Not started
- In progress (`completed/total`)
- Done / completed

Colors are calm (muted vs default text). No red “overdue.” No amber “late.” `common.required` exists for forms, not for training status.

Reports and the board use the same three completion words. They do **not** encode obligation.

**Fit:** Shared labels are the right spine for both contexts.

**Gap:** There is no caption that says whether “not started” means “not yet invited to begin” or “assigned work not begun.” Rehab directors have to infer. Church leaders may already read “not started” as shame if the board is used like attendance.

**Severity:** Medium (missing caption), not a blocker. Do not add overdue colors in this pass — that would leak mandatory framing into church.

---

### 3. Reminders and notifications

| Channel | Who | Cadence | Tone | Father can mute |
| --- | --- | --- | --- | --- |
| Weekly session | Automatic | One/week if next session open and not started | Neutral-ready | Yes |
| Action reminder | Automatic | Once, at the time he named | “You said you would… Still on for it?” | Yes |
| New assignment | On assign | Once | Neutral | Yes (`newTrainings`) |
| Certificate | On issue | Once | Reward | Yes |
| Leader note / nudge | Manager confirms | 7-day cooldown; quiet = 14 days unused | Invitation | Yes (`leaderEncouragement`) |
| Nudge panel bulk | Manager confirms | Same cooldown | Same | Same |

Frequency is **shared** and already conservative (weekly ceiling, quiet hours, confirm-before-send). That fits both contexts. Changing frequency by mode would be a rules engine. Out of scope.

What does not fit:

- Automatic copy cannot get firmer for expected programs.
- A church cannot make the quiet panel less “compliance.”
- A father in a required program can turn off the only weekly reminder and the leader’s notes. That is a **product decision already shipped** (consent). Do not override it here. Mandatory programs still need the **leader** to see status; they should not silently email against prefs.

**Severity:** High for copy. Low for cadence. Do not take mute away.

---

### 4. Consequence and accountability framing

Present:

- Roster / board: not started, quiet, stalled, assigned N days ago.
- Certificates: reward for full completion.
- Streak freezes: game mechanic, father-only, not framed as punishment.

Absent:

- Due dates
- Overdue / late
- Required / must complete
- Escalation, lockout, or report-to-court language
- Different certificate rules by context

One-sided: the **absence** of consequence language is itself a choice — it protects church and weakens rehab/military credibility (“the tool does not take completion seriously”).

**Severity:** High as a *framing* gap, not as a missing workflow. Light signals only (expected vs invited). No new punishment system.

---

### 5. Manager controls

None for context. Locale, photos, display title, reminder prefs (father-owned), and accept/decline of catalog items do not change tone.

A leader cannot say “this house expects completion” or “this group is invitational.”

**Severity:** High. One control at **group** (organization / cohort) level is the smallest fix. Assignment-level flags would be a second product.

---

### 6. Cross-context risks

| If we ship only invitation copy | Hurts rehab / military adoption. Directors will not send “no catch-up required.” |
| If we ship only obligation copy (“overdue”, “required”, red badges) | Hurts church. Feels like attendance and shame. |
| If we add two apps | Violates the constraint. |
| If default becomes mandatory | Church pilots that never open settings get the wrong voice. |
| If we use forbidden father words (`late`, `rehab`, `unit`, `days` in push) | Breaks the notification safety tests and can out a setting. |

---

### Severity map

| ID | Finding | Severity |
| --- | --- | --- |
| C1 | No group context flag | High |
| C2 | Father notes say “whenever / no rush / no catch-up required” | High |
| C3 | Manager desk sounds like compliance (“stalled”, “seats”) with no voluntary variant | Medium |
| C4 | Status labels are shared and fine; missing one-line context | Medium |
| C5 | Reminder **frequency** is shared and fine | — |
| C6 | Father can mute reminders (keep) | — |
| C7 | No overdue/late (keep; do not add) | — |

No **Blocker**. The app works. The voice is wrong in one of the two houses depending on who is logged in.

---

## Phase 2 — Minimal viable context support

### One flag, group level

`groups.participation_mode`: `unset` | `expected` | `open`

- **unset** (default): shared professional copy. Factual. No “must.” No “whenever you feel like it.” Safe if the leader never opens the setting.
- **expected**: rehab, unit, required programs. Assigned work is expected. Still no shame, no overdue, no mute override.
- **open**: church / voluntary. Invitation. Men set the pace.

Not per assignment. Not a rules engine. Mixed groups on one manager: each group has its own setting; father-facing copy follows **his** group. Manager surfaces with several groups use `unset` (neutral) unless every group matches.

### What stays shared

- Assignment mechanics, RLS, `manages_father`
- Status words: not started / in progress / done
- Reminder cadence, quiet hours, confirm-before-send, father mute
- Certificate rules
- No overdue colors

### Language variants (only these)

**Father notifications** (`notificationCopy`)

| Type | unset | expected | open |
| --- | --- | --- | --- |
| Weekly | Next session is ready | Your assigned session is ready | Your next session is ready when you want it |
| New assignment | New training from {leader} | {leader} assigned this training | {leader} opened a training for you |
| Leader note A | First session is open | Your assigned first session is open | First session is open when you are ready |
| Leader note B | You are n of m. Continue when you can. | You are n of m. The next session is still yours to finish. | Pick it back up when you can |
| Leader note C / default | Training is still open | Assigned training is still open | Still here whenever you want it |

No `late`, `days`, `must`, `required`, `rehab`, `unit` in father channels.

**Manager UI**

- Dashboard lead + one-line status caption
- Quiet panel lead
- Companion “seats / stalled” line
- Nudge template previews
- Setting copy itself

**Father empty / hold**

- unset: current wait-on-leader (slightly tightened)
- expected: “Your leader will assign the training this program uses.”
- open: “When your leader opens a training, it will show up here. No rush.”

### Consequence framing

- **expected:** “not started” after assign is visible as unfinished assigned work. Quiet panel stays. Notes say the session is still his to finish.
- **open:** same data, softer verbs (quiet → “no recent activity”; stalled unused).
- **unset:** factual counts only.

### Control

On Dashboard, under the invite code for each group: three options, one sentence of help. Save is a single update on that group. Does not change who can be assigned.

### Out of scope

- Per-assignment mode
- Changing mute or weekly frequency
- Overdue badges
- Touching `main`
- Popping the stashed ops-hardening `participation_mode` work (this is a smaller, copy-only flag)

---

## Phase 3 — Implementation notes

Implemented on `cursor/mandatory-voluntary-context-7c78`. Helpers in `lib/participation.ts`. Column `groups.participation_mode` (`unset` | `expected` | `open`, default `unset`). Copy keys `*Expected` / `*Open` sit next to the shared string. `participationCopyKey(mode, base)` picks the variant.

The Dashboard setting is one card under the invite codes. It updates only that group. It does not change who can be assigned, reminder cadence, mute, or status colors.

Father-facing notifications read the father’s group at send time (`lib/notifications/dispatch.ts`). Mixed groups on one manager stay `unset` on shared desk copy. Opening one man uses *his* group.

Pilot (`koeplcybddrvbliuepsy`) has the column. Existing groups stay `unset` until a leader saves.

---

## Phase 4 — Verification

### Rehab / military leader (Expected)

- Dashboard lead: “Assign the training you expect them to complete.”
- Status strip: “Assigned work and who has not started it.” Same not-started / in-progress / done words. No overdue color.
- Quiet panel: “Assigned training with no recent activity.”
- Assistant: “Assigned, no recent activity.” Stall line is “Still on Session n,” not “Stalled.”
- Note previews: “The assigned session is still open.” / “still his to finish.”
- Father empty / hold: the program will assign the training it uses.
- Weekly / new assignment / leader note: “assigned session,” “{leader} assigned this training.” No `must`, `required`, `late`, `rehab`, or `unit` in the father channel.
- Reminder cadence, quiet hours, confirm-before-send, and father mute are unchanged.

### Church leader (Open)

- Dashboard lead: “Offer a training. Men set the pace.”
- Status strip: “Who has been offered which training.”
- Quiet panel: “No recent activity. A short note is optional.”
- Assistant: “No recent activity.” Stall line is “Last opened Session n.”
- Note previews: “when he wants it” / “Invite him back when it fits.”
- Father empty / hold / reminder opt-in: invitational, including “No rush” on hold.
- Weekly: “ready when you want it.” New assignment: “{leader} opened a training for you.”
- Same tools, same mute, no overdue.

### Unset (default, mixed groups, or never saved)

- Shared professional copy. Factual. No “whenever you are ready.” No “must.”
- Dashboard lead stays “Assign work and see who has it.”
- Father home: “Your leader will open your first training. We will let you know.”
- Leader note A: “Your first session is open.” (the old “when you are ready” leak is gone)
- Safe if a church or rehab never opens the setting.

### What does not leak

| Direction | Guard |
| --- | --- |
| Expected → father | No `late`, `required`, `must`, `rehab`, `unit`, `days` in notifications (`tests/nudge-panel.test.ts`, `tests/participation.test.ts`) |
| Open → rehab desk | Expected mode never shows “optional note” / “when he wants it” |
| Unset → either house | Neutral. Neither “no rush” nor “you must finish.” |
| Manager hints | “Rehab, unit…” appears only on the Dashboard setting, never in father copy |

### Files changed

- `supabase/migrations/20260819190000_group_participation_mode.sql`
- `lib/participation.ts`, `lib/participation-data.ts`
- `lib/manager/types.ts`, `lib/manager/actions.ts`, `lib/manager/nudges.ts`
- `lib/notifications/types.ts`, `lib/notifications/copy.ts`, `lib/notifications/dispatch.ts`
- `lib/i18n/messages/en.ts`, `lib/i18n/messages/he.ts`, `lib/i18n/flash.ts`
- `components/manager/participation-mode-card.tsx`
- `components/manager/assignment-status-strip.tsx`
- `components/manager/companion-panel.tsx`, `companion-nudge-suggest.tsx`, `nudge-panel.tsx`
- `app/(manager)/manager/page.tsx`
- `app/(manager)/manager/participants/page.tsx`, `participants/[id]/page.tsx`
- `app/(father)/father/page.tsx`, `trainings/page.tsx`
- `app/(father)/father/start/hold/page.tsx`, `start/reminder/page.tsx`
- `tests/participation.test.ts`, `tests/nudge-panel.test.ts`
- `docs/ORG-MANAGER-PARTICIPATION-CONTEXT-AUDIT.md`

Unchanged on purpose: assignment RLS, status words and colors, reminder frequency, mute, certificates, reports filters.

### Robust now

- One group flag, three voices, default safe.
- Father mail follows his group even when the manager’s other groups differ.
- Missing column or unknown value reads as `unset`.
- Typecheck and 205 unit tests pass.

### Still needs live leaders

- Whether **Expected** / **Open** / **Not set** are the words rehab directors and pastors would choose.
- Whether expected father copy is firm enough for a required house without feeling like attendance.
- Whether church leaders will find the setting under the invite code, or leave `unset` and still hear “Assign work.”
- Mixed-org managers (one expected house + one church) seeing neutral desk copy. Rare in the pilot.
- Hebrew tone with Israeli church and rehab leaders.
- The existing product decision that a father in a required program can still mute weekly mail. Directors may want that discussed; this pass does not override mute.
