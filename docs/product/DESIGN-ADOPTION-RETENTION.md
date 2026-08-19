# Design: Adoption & Retention (Father Participants)

**Repo:** StrategyandDesign/fathers-com-platform  
**Branch:** `audit/ux-security-hardening`  
**Date:** 2026-08-12 (America/Chicago)  
**Scope:** High-leverage UI/UX for receptivity, adoption, and retention — not a visual redesign.

Audience includes stressed, court-adjacent, and return-from-time-away men. Tone: dignified, secular-default, no shame, FORGE. Copy avoids banned clinical / carceral labels (POSITIONING.md §9).

---

## What shipped in this pass

### 1. Homepage — one primary path (Hick’s law)
- Replaced the dual Father/Manhood intent chooser with **one loud CTA**: Start free Profile (~20 min) → Father Profile.
- Secondary: **Log in** and **I have a facilitator** (organizations).
- Manhood demoted to a quiet text link.
- Added a **How it works** strip: Profile → Plan → Course (with facilitator).
- Trust line (no fake stats): free for participants · facilitator-supported · certificate you can verify.

### 2. Keystone assessment receptivity
- Progress chrome always shows **section X of 3**, item progress, overall answered %, and an **honest minutes-left** estimate (~9s/item from remaining count).
- Removed per-item scale-label chrome so the screen stays single-question focused (Typeform-style).
- Password create/sign-in for save-later and save-plan **verified** (no magic-link copy).
- Celebration retained; **one** next action: **Start my plan** (report is a fine text link).

### 3. Mobile / returning user
- Public **Log in** moved into `.nav-links` so the MENU drawer reaches it (was `.hide-m` in nav-right).
- App nav includes **My Plan**; signed-in participant nav includes My Plan + Sign out in the drawer.
- MENU toggle: `aria-expanded` + `aria-controls="fc-nav-links"`.

### 4. Enroll / dashboard claim recovery
- Claim-required enroll and unclaimed dashboard next-action already routed to plan + org finders; copy polished for dignity (accountability framing, not “you failed a gate”).

### 5. Catalog positioning (pilot stack A)
- Helper under the course grid: Coming Home Present = return spine; Steady = skills add-on; Same Team = co-parenting; Fundamentals = foundation / alumni — courses remain visible.

### 6. Build discipline
- HTML regenerated via `python3 build_pages.py` after builder edits.
- Touched JS syntax-checked with `node --check`.

---

## Industry patterns applied

| Pattern | Where |
| --- | --- |
| **Hick’s law / choice overload** — one default path at cold start | Homepage hero |
| **Time-to-value** — promise and surface ~20 min, free | Hero CTA + trust line |
| **Progress salience** — section, item, % , honest time left | `keystone-ui.js` |
| **Typeform single-focus** — one question, less chrome | Keystone item view |
| **Duolingo-style one next action** | Celebration → Start my plan; dashboard unclaimed → plan |
| **SDT: autonomy** — mode choice, save later, no shame | Keystone gates |
| **SDT: competence** — celebration + plan as the build | Post-assessment |
| **SDT: relatedness** — facilitator-supported course, not self-serve theater | How it works / enroll |
| **Mobile thumb zone** — Log in / My Plan in drawer | Nav + `app.js` |
| **Nonprofit / court-safe trust** — verifiable certificate, no fake stats, banned-word hygiene | Trust line, catalog, claim copy |

---

## Principles behind the bets

1. **Hick’s law** — Decision cost is highest before any value. Default the Father Profile; keep Manhood reachable without forcing a fork.
2. **Time-to-value** — Stressed men need a clear ask and an honest clock. Fake countdowns and dual tracks burn trust.
3. **Progress salience** — Long instruments (128 items) need continuous “how far / how long” or abandonment spikes mid-run.
4. **Self-Determination Theory** — Autonomy (password account he owns), competence (celebration → plan), relatedness (facilitator claim as dignity, not punishment).
5. **Mobile thumb zone / a11y** — Returning users must reach Log in / My Plan without desktop-only chrome; MENU must expose state.
6. **Trust** — Free + facilitator-supported + verifiable beat invented completion rates for this audience.

---

## Bigger bets recommended next (not shipped)

1. **Lifecycle email live** — Resend SMTP + scheduler; soft opt-out for weekly/course; welcome on first baseline. External trigger is still the largest retention gap.
2. **Facilitator “your man signed up” alert** — Closes the claim loop without the man hunting.
3. **Journey rail on course/enroll** — Progress salience across Profile → Plan → Course.
4. **Wire live Vimeo IDs before Aug 16 launch** — Content JSON still has `vimeo: pending` on course sessions; launch is film-first (no written-session primary). Treat ID upload + player smoke as a hard gate.
5. **Circles only via cohort/claim** — Already tightened auto-join; deepen facilitator-opened rooms.
6. **A/B default hero** — Measure abandon on single CTA vs prior dual-intent (keep Manhood as secondary).
7. **Post-plan micro-habit** — One “mark this week’s move” push that doesn’t depend on course claim.
8. **Court packet / verify share sheet** — One-tap proof for coordinators after first certificate (variable reward that matters here).

---

## Files touched (this UX pass)

- `build_pages.py` — homepage hero, how-it-works, nav (Log in / My Plan / aria), certificates helper  
- Generated: `index.html`, `certificates.html`, and other pages from the builder  
- `assets/js/keystone-ui.js` — progress, time left, single-focus, Start my plan  
- `assets/js/app.js` — aria-expanded MENU; participant Sign out in drawer  
- `assets/js/enroll.js` — claim_required dignity copy  
- `assets/js/dashboard.js` — unclaimed next-action copy  
- `/workspace/audit/DESIGN-ADOPTION-RETENTION.md` — this document  

No commit/push from the agent (per instruction).
