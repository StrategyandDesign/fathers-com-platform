# Father Journey UX Audit

**Repo:** StrategyandDesign/fathers-com-platform  
**Checkout audited:** `/tmp/fcp` at `2801c9e` (feat/father-journey-retention tracking main after PR #11 merge)  
**Date:** 2026-08-12 (America/Chicago)  
**Scope:** Father path after homepage: Profile → Report → Plan → Courses → Dashboard  
**Method:** Read actual HTML/JS/CSS only. No invented UI. Audit only; no product edits.

Doctrine in force: facilitator-supported self-paced film; claim for Q&A/accountability; sponsorship = org certification not man seats; free for claimed men; competence + proof over vibes; minimize em dashes.

---

## A) Current step-by-step user flow

### 0. Homepage (`index.html`)
- **Sees:** Hero "Become the father they can count on." Path rail 1 Profile → 2 Plan → 3 Course. Trust bar: Free for participants · Facilitator-supported · Verifiable certificate.
- **Primary CTA:** `Start free Profile · about 20 min` → `profile.html`
- **Secondary:** Log in; quiet Manhood track link; How it works strip; org/sponsor paths below fold.
- **Note:** Homepage path **skips Report**. Journey rail later inserts Report as step 2. Vocabulary already splits.

### 1. Profile (`profile.html` + `assets/js/keystone-ui.js`)
- **Sees (conversion intro, nochrome):** Photo + "Know where you stand. / Train what matters." Sample Likert (labeled example). Four dim cards (Involvement, Consistency, Awareness, Nurturance). What happens after: Scores → Plan → Film courses. CTA **Begin the Profile**.
- **After Begin:** Assessment shell unhides. Then, unless homepage intent / resume / prior `ks_intro_done`:
  1. Optional **gate** ("I'm raising children now" vs "preparing/mentoring") if no `fc_intent_path`
  2. **`chooseMode`** — All at once (~20 min) vs Section by section
  3. Likert runner with section / item / % / minutes-left chrome
- **Save mid-run:** password account create; resume via `fc_resume_intent`
- **Finish (father path):** Celebration results: strength hero, overall band, next-move gap, first three moves, expandable 26 dimensions.
  - Signed in → yellow **Start my plan** → `plan.html?reveal=1`; fine link to `report.html`
  - Signed out → email+password card CTA **Start my plan**, but `savePlanAccount()` redirects to **`report.html?assessment=…&claim=…`** (not plan)
- **Preparing path:** Reflective finish → **Explore the certificate paths** → `certificates.html` (skips plan)

### 2. Report (`report.html` + `keystone-report.js`)
- **Nav chrome:** **Public** mode (Profile / Courses / For organizations / Log in + Start Profile). A finished father still sees marketing nav, not Dashboard / My Plan.
- **Sees:** Full written report (glance, dimensions, practices, satisfaction, twelve weeks). Journey rail injected by JS: Profile ✓ → **Report** (here) → Plan → Courses.
- **Primary CTA:** **Open my plan** → `plan.html?assessment=…`
- **Secondary:** Home → `dashboard.html`; print/email; per-chapter "Train this section →" → **`class.html`** (Fundamentals only); "All classes" → `classes.html` (instant redirect to certificates).
- **Empty / sample:** Push to Profile.

### 3. Plan (`plan.html` + `plan-controller.js` + `plan-engine.js` + `home.js`)
- **Nav:** App mode: Dashboard / My Plan / Courses / Circle. Auth required.
- **Journey rail:** Plan current; done = profile, report.
- **Sees when result exists:**
  1. Hero: Week N, baseline band, "Your focus is **{scale}**"
  2. **DO THIS WEEK** card: focus label, 2 checkbox actions, "Set when and where" cues, cheer on complete
  3. **YOUR TWELVE WEEKS** arc (Establish / Deepen / Sustain) + actions done / weeks showed up / cues set
  4. Lead from strength + Also worth tending
  5. **WHEN YOU FINISH** certificate card → generic `certificates.html`
  6. Foot: Home | full report | **"Classes for this focus"** → `classes.html` (redirect, **no focus param**) | Retake
- **Below plan (`home.js` feed, signed-in only):** YOUR WORK cards: report, Fundamentals course (or stalled/continue), Certificate proof, tiles "THE THREE COURSES" with Steady + Coming Home marked **IN DEVELOPMENT** (stale vs live catalog), stale-profile retake after 90 days.
- **No result:** "Take the Keystone Profile first."

### 4. Courses (`certificates.html` + course pages + `course.html` / `coursework.js` + `enroll.js`)
- **Public nav** even for signed-in fathers browsing catalog.
- **Sees:** Father-first hero ("Train what matters. On your own time."), Profile CTA + Browse + Verify. Path strip 01/02/03. Four visual course cards with session previews (Fundamentals, Coming Home Present, Steady Under Pressure, Same Team). Where-to-start helper. Verify pillars below.
- **CTAs diverge by card:**
  - Fundamentals → `enroll.html?cert=fundamentals…`
  - Others → marketing pages (`course-coming-home-present.html` etc.) then enroll/player
- **`course-catalog.js`:** If Supabase has published courses, rewrites cards to Start / Continue / Earned with real enrollment state.
- **Enroll:** Requires auth + **active claim**. `claim_required` → Continue free plan / Find org / How facilitators work.
- **Player (`course.html`):** Auth required. Back link **"← All certificates"**. Film + checkpoint + Final Q&A. All content JSON still has `"vimeo": "pending"` → "Film loading soon" / session guide fallback.
- **`classes.html`:** Hard redirect to `certificates.html`. **`class.html`:** Fundamentals marketing deep-dive; CTA often **Get your baseline** (Profile), not enroll.

### 5. Father dashboard (`dashboard.html` + `dashboard.js`)
- **Nav:** App mode. Journey rail with **no current step** (directory).
- **Sees:** Welcome; sticky **Next action** band; optional multi-profile switcher; courses strip (progress bars if enrolled); collapsed report via `FCReport.render(…, {collapse:true})`; WHAT IS NEXT cards.
- **Next-action logic:**
  - No claim, not enrolled → Keep plan moving → `plan.html`
  - Claimed, not enrolled → Enroll film course → `certificates.html`
  - Enrolled with remaining → Resume → **`certificates.html`** (catalog, not specific `course.html`)
  - Else → Open plan
- **Empty / signed out:** Start Profile / Sign in. Demo without keys → Marcus sample.
- **Not the admin `participant.html`:** that is staff search/view-as.

### Redirect / handoff map (actual)

| From | Primary | Secondary / traps |
| --- | --- | --- |
| Home | Profile | Login, Manhood, orgs |
| Profile done (in) | Plan | Report (fine) |
| Profile done (out) CTA "Start my plan" | **Report** (code dest) | — |
| Report | Plan | class.html, classes→certificates, dashboard |
| Plan | Checkboxes / cues | certificates (generic), classes→certificates, report, dashboard |
| Plan feed | class.html / course.html?cert=fundamentals | certificates#waitlist (dead anchor) |
| Courses | enroll / course marketing | Profile, verify |
| Enroll no claim | Plan | orgs, facilitators |
| Dashboard | Plan or certificates | course.html only from course cards |

---

## B) Friction points / resistance

### Cognitive load
1. **Too many gates before first Likert:** Intro → (gate father/manhood) → (mode all/section) → first item. Homepage already chose Father; gate still appears when `fc_intent_path` is absent (plain `profile.html` link).
2. **Path vocabulary split:** Home = Profile/Plan/Course; `FCJourney` = Profile/Report/Plan/Courses; Plan foot = Classes; course.html = Certificates; nav = Courses. Same product, four nouns.
3. **Report as a full second document** after celebration already showed strength/gap/moves. Busy fathers re-process the same insight before the plan (especially if signup lands on report).
4. **Dashboard stacks** next-action + journey rail + switcher (3 buttons) + courses + collapsed report + what-is-next cards. Loud primary exists, but the page still feels like a menu.

### Broken / weak handoffs
5. **CTA lie:** Celebration button **Start my plan** for signed-out users navigates to **report.html** (`keystone-ui.js` `savePlanAccount` dest).
6. **Plan → course is not personalized:** Certificate card and "Classes for this focus" ignore `plan.focusScale`. Focus excitement dies at the handoff.
7. **`home.js` stale catalog:** Marks Steady / Coming Home **IN DEVELOPMENT** and links `#waitlist` while `certificates.html` sells four live courses. Trust hit for returning users.
8. **Enrolled resume CTA** on dashboard points at **catalog**, not `course.html?cert=…`.
9. **Report chapter CTAs** always train via **Fundamentals** (`class.html`), even when gap is anger/co-parenting/return-related.
10. **Public nav on report + certificates** after login: Start Profile / Log in still visible; My Plan buried unless they know dashboard URL.

### Missing excitement / competence signals
11. Plan week actions are strong (concrete, cueable) but **no film preview** tied to this week's focus. Competence path feels checklist-only until they wander into Courses.
12. Certificates hero now sells voluntary film well; **post-plan surface does not**. Returning father on plan sees generic "when you finish" proof, not "Session 1 of Steady matches your focus."
13. Circles page still shows **hardcoded demo** (Tuesday Group, named members). Feels fake if he has no cohort.

### Claim / adoption wall
14. Unclaimed men correctly kept on plan (good), but **no "tell your facilitator" one-tap** or "we notified your program" loop. He holds a plan with no film until someone else acts.
15. Course cards mix **Enroll free** (claim-gated) with **Open the course** (marketing). Looks self-serve; then enroll fails. Dignity copy in `enroll.js` is good; the pre-enroll promise is soft.

### Jargon / labels
16. Keystone / dimensions / practices / satisfaction / Certificate of Completion / claim / serial — mostly explained, but **claim** never appears in father-facing plan copy as a word he must learn; good. Still: "band", "gap", "supporting", "phase" on plan is trainer language.
17. Nav **Circle** vs page title **My Circle** vs footer **Groups & Circles**.

---

## C) Necessary vs feature creep (this market)

Audience: skeptical busy fathers, often program-referred; want competence + proof; voluntary engagement beats compliance theater; free when claimed.

### NECESSARY (keep / sharpen)
| Capability | Why |
| --- | --- |
| Profile (~20 min) with honest progress + strength/gap | Competence baseline; dignity |
| One weekly plan move + if-then cue | Habit without course claim |
| One recommended next film course from focus | Excitement + relevance |
| Claim-gated enrollment + verifiable certificate | Proof for courts/programs; doctrine |
| Facilitator-supported self-paced player (film → checkpoint → final) | Core product |
| Sticky single next action on return (dashboard or plan) | Retention under stress |
| Resume assessment / resume course | Drop-off recovery |
| Free forever framing for the man | Non-negotiable trust |

### FEATURE CREEP (defer or demote)
| Capability | Why demote |
| --- | --- |
| Full 26-dimension written report as default post-Profile step | Heavy; celebration + plan already carry value. Keep as "Open full report" |
| Dual Profile switcher (Father + Manhood) on day-one dashboard | Rare; clutter for referred fathers |
| Circles as primary nav item before cohort exists | Empty/demo room kills trust |
| Certificates marketing wall (pillars, specimen, org aside) **above** personalized next course for signed-in users | Org-proof belongs after "your next film" |
| Mode choice (all vs section) as a blocking screen | Default all-at-once; offer section as fine link |
| Father/Manhood gate after homepage Father CTA | Skip when intent is father |
| home.js "three courses / in development" tiles | Contradicts catalog; delete or fix |
| Stories / military / gift surfaces | Already dark; keep dark |
| Retake Profile footers everywhere | Soft link once, not every surface |

---

## D) Recommended TARGET EXPERIENCE (by stage)

### 1. Profile
- **Hierarchy:** Photo + promise → sample item → **Begin** (dims as secondary strip).
- **Copy:** Keep "Know where you stand. Train what matters." Add under CTA: "You will leave with a score and one next move."
- **Primary CTA:** Begin the Profile
- **Flow trim:** If arriving from homepage Father CTA (or default), skip gate; default **all at once**; "Prefer shorter sittings?" as fine link into `by_section`.
- **Finish:** Celebration stays. Primary always **Start my plan** → **`plan.html`**. Report = fine text only. Fix signup dest to match CTA.

### 2. Report (demote in default path)
- **Role:** Deep reference + print/PDF for facilitator or court packet. Not the default next click after Profile.
- **Copy hierarchy:** At a glance (4 scores) → Your focus this quarter → Open plan. Full chapters below.
- **Primary CTA:** Open my plan  
- **Nav:** App chrome when signed in (Dashboard / Plan / Courses).
- **Train links:** Map section/gap → recommended course slug, not always Fundamentals.

### 3. Plan (home base for the week)
- **Hierarchy:**
  1. Week N + focus name (one line meaning)
  2. DO THIS WEEK (checkboxes + cue)
  3. **NEXT FILM FOR YOUR FOCUS** (embedded card: course title, session 1 title + quote, 15–20 min, photo, CTA)
  4. Ninety-day arc (compact)
  5. Strength / tending (collapsed or secondary)
- **Primary CTA (unclaimed):** Mark this week's move / Set your cue  
  Secondary: "Ask your facilitator to open your seat" → short how-to  
- **Primary CTA (claimed / enrolled):** Continue Session N → `course.html?cert=…`
- **Copy example (focus Consistency):**  
  Eyebrow: NEXT FILM FOR YOUR FOCUS  
  Title: Fathering Fundamentals · Session 2  
  Line: "A Schedule They Can Trust. Standing time, the calendar as a promise."  
  Button: Watch this week's film (~19 min)

### 4. Courses
- **Signed-out / browse:** Keep father-first catalog (current certificates.html direction is right).
- **Signed-in with plan focus:** Landing should **not** restart at marketing hero. Show: "Recommended for you" hero card, then the other three.
- **Primary CTA:** Start recommended course (enroll or resume). Browse = secondary.
- **Label:** Nav and back-links say **Courses** everywhere; retire "All certificates" / "Classes for this focus."

### 5. Dashboard (return home, not a fourth product)
- **Hierarchy:** Next action (one) → This week on your plan (one line + link) → Your course progress OR recommended course → Report (link, collapsed).
- **Primary CTA examples:**
  - Unclaimed: Continue Week N on your plan
  - Claimed unused: Start {Recommended Course}
  - In course: Resume {Course} · Session N
- **Drop:** Triple equal buttons (plan/report/browse) in switcher; keep one primary + text links.
- **Circles:** Only in nav when `participant_claims` / cohort membership exists; else omit or badge "Opens with your program."

---

## E) Priority implementation list

### P0 — handoff bugs and contradictions (pre-launch)
| # | Change | Exact files |
| --- | --- | --- |
| P0.1 | Signup / "Start my plan" must land on **`plan.html`**, not report. Keep report as fine link. | `assets/js/keystone-ui.js` (`savePlanAccount` dest; celebration links) |
| P0.2 | Fix stale **IN DEVELOPMENT** / `#waitlist` tiles; align with four live courses or remove feed tiles. | `assets/js/home.js` |
| P0.3 | Dashboard enrolled next-action → **`course.html?cert={slug}`** (resume), not catalog. | `assets/js/dashboard.js` (`nextStrip`) |
| P0.4 | Rename course back-link "All certificates" → "All courses". | `course.html` / `build_pages.py` |
| P0.5 | Plan foot "Classes for this focus" → focused course URL (or remove until mapping ships). Stop dumping through `classes.html`. | `assets/js/plan-controller.js` |
| P0.6 | Wire live Vimeo IDs (launch hard gate). Pending IDs make film-first promise hollow. | `content/*.json`, Studio/import pipeline, `assets/js/coursework.js` (smoke) |
| P0.7 | Report/certificates use **app nav when signed in** (or soft-swap links: Dashboard, My Plan). | `build_pages.py` `nav()`, `assets/js/app.js` |

### P1 — adoption + retention spine
| # | Change | Exact files |
| --- | --- | --- |
| P1.1 | **Focus → course recommendation map** + embedded "Next film for YOUR focus" card on plan (see §F). | `assets/js/plan-engine.js` or new `assets/js/course-recommend.js`; `plan-controller.js`; optional CSS in `assets/css/forge.css` |
| P1.2 | Skip father/manhood **gate** when default/home Father path; default all-at-once with fine-link section mode. | `assets/js/keystone-ui.js` |
| P1.3 | Journey rail + homepage HIW vocabulary aligned: Profile → Plan → Course (Report as sublink of Profile/Plan, not a peer stage). | `assets/js/journey.js`, `build_pages.py` (index HIW), plan/report mounts |
| P1.4 | Signed-in `certificates.html`: recommended course hero from latest `gap_scale` / enrollment state; demote specimen/org blocks. | `certificates.html` / `build_pages.py`, `assets/js/course-catalog.js` |
| P1.5 | Report chapter "Train this section" uses recommendation map. | `assets/js/keystone-report.js` |
| P1.6 | Facilitator alert when man completes Profile / hits plan (closes claim loop). | edge function + `lead.html` / email templates (`build_emails.py`, `supabase/functions/send-email`) |
| P1.7 | Lifecycle email: welcome + weekly "this week's move" (soft opt-out). | email pipeline docs + functions |

### P2 — polish / later
| # | Change | Exact files |
| --- | --- | --- |
| P2.1 | Hide Circle nav until cohort membership. | `build_pages.py` nav + `assets/js/app.js` / `circles.js` |
| P2.2 | Replace circles hardcoded demo with empty state ("Your facilitator opens the room"). | `build_pages.py` `circles.html`, `assets/js/circles.js` |
| P2.3 | Collapse dashboard switcher to one primary CTA + text links. | `assets/js/dashboard.js` |
| P2.4 | Profile intro: move Begin above the fold on mobile (dims/after below). | `profile.html` / `build_pages.py`, `forge.css` |
| P2.5 | Court packet / verify share sheet after first certificate. | `certificate.html`, `verify.html`, share JS |
| P2.6 | A/B: celebration → plan only vs celebration → report→plan. | analytics hooks in `keystone-ui.js` |

---

## F) Special answer: Courses after plan — separate page or embedded?

### Recommendation: **Embedded primary card on Plan + Courses page as library**

**Architecture ("next film course for YOUR focus"):**

1. **Plan is the weekly home.** Directly under DO THIS WEEK, render one card:
   - Course + session matched to `gap_scale` (and claim/enrollment state)
   - Session title, one-line quote, runtime, still image
   - CTA:
     - No claim → `Ask your facilitator to open {Course}` + link to plan stays primary for the habit
     - Claimed, not enrolled → `Start {Course}` → enroll
     - Enrolled → `Resume Session N` → `course.html?cert=…`
2. **`certificates.html` remains** the browse/library and org-proof surface (verify, all four courses, specimen). Signed-in entry from nav opens library with **recommended** pinned top; cold traffic keeps marketing hero.
3. **Do not** make Courses a mandatory peer step equal to Plan in the weekly loop. Journey rail should read: Profile → Plan → Course, with Course meaning "your recommended film," not "go shop four SKUs."

**Why not Courses-only separate:**
- Separating without a focus card recreates today's dead handoff (generic certificate card → four choices → claim wall).
- Busy fathers will do the checkbox week and never browse.

**Why not Plan-only embedded (no Courses page):**
- Need a place for verify story, session previews, and the other three courses once Fundamentals is done.
- Facilitators/orgs send men to a stable catalog URL.

**Suggested focus → course map (v1, ship in `course-recommend.js`):**

| Focus scales (examples) | Course slug | First session hook |
| --- | --- | --- |
| involvement, consistency, commitment, time_*, modeling, … | `fundamentals` | Session matching schedule/presence |
| emotional_*, anger-adjacent, self_care, work_life, … | `anger` (Steady Under Pressure) | The Alarm System |
| mother_*, coparent*, marriage_* | `coparenting` (Same Team) | One Team for the Children |
| Program flag / prefs return-from-time-away (when available); else reentry scales if present | `reentry` (Coming Home Present) | The Body You Bring Home |
| Default / unknown gap | `fundamentals` | Why Presence Wins |

Keep the map data-driven and tiny; do not build a recommender UI.

---

## Bugs / inconsistencies visible in code

1. **Intro skip (fixed in `2c2f09b`):** `keystone-ui` no longer auto-wipes `#ksIntro` on load; waits for Begin unless resume/intent/`ks_intro_done`. Dual begin handlers remain (inline script + `keystone-ui`) — works, but fragile; consolidate later.
2. **Start my plan → report.html** for account create (`keystone-ui.js` ~585) while button label and signed-in link promise plan.
3. **home.js** still says Steady / Coming Home **IN DEVELOPMENT**; certificates sells them live; `#waitlist` anchor missing.
4. **Nav noun drift:** Courses (nav) / certificates.html (file) / "All certificates" (player) / Classes (plan foot + report) / class.html (Fundamentals).
5. **Journey vs homepage:** Report included in `FCJourney.STAGES` but omitted from homepage HIW (Profile/Plan/Course).
6. **report.html `mode='public'`** — finished users see Start Profile CTA in header.
7. **Dashboard resume → certificates.html** not player.
8. **All Vimeo IDs pending** in `content/*.json` — player shows placeholder path.
9. **circles.html** static demo content (dates in the past: Jul 14) presented as live.
10. **participant.html** is admin tooling; naming collision with "father participant dashboard" (`dashboard.html`).
11. **Preparing finish** still says "three courses" and links `classes.html` (`keystone-ui.js` `finishPreparing`).
12. **course-catalog.js** rewrite drops photo media / session preview markup from static cards when live DB paints (excitement regression for signed-in users).

---

## Summary judgment

The spine is right: **Profile → Plan → facilitator-supported film → proof.** Recent conversion work on Profile intro and Certificates hero is directionally correct for voluntary fathers.

The retention leak is the **middle handoff**: after a strong plan week UI, the product shrugs ("see how the certificate works") instead of naming **one film for his focus**. Fix the CTA/dest bugs (P0), embed the recommended session on Plan (P1.1), keep Courses as library, and demote Report/Circles/catalog shopping from the weekly path. That is the shortest path to adoption without feature creep.
