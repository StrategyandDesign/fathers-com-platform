# Flagship Design Pass

**Repo:** StrategyandDesign/fathers-com-platform  
**Branch:** `audit/ux-security-hardening`  
**Date:** 2026-08-12 (America/Chicago)  
**Launch:** Aug 16 2026, film-first  
**Constraint:** No commit/push from this pass.

---

## Unique opportunity thesis

Fathers.com is the rare hybrid of **facilitator-supported film courses** and a **digital activation path** that a stressed father can start alone:

1. **Keystone Profile** (free, ~20 minutes, private)  
2. **Twelve-week plan** (built from his gaps)  
3. **Film courses** with a Certified Facilitator (claim, watch, checkpoint, verifiable certificate)

Organizations get B2B infrastructure: cohort claims, completion proof, public serial verify. Fathers get dignity and one next action. Sponsors fund **organization certification and facilitator credentialing**, not individual seat gifts. That keeps the product story coherent: men stay free; the standard is what gets funded.

---

## Principles (exerted everywhere)

1. **One activation path** — Profile → Plan → Course (facilitator). Fathers never hunt.  
2. **One next action** — sticky, loud, calm. Edtech activation without childish gamification.  
3. **Progress salience** — section/item/%/time; course resume; plan week as “weeks you showed up,” not shame streaks.  
4. **Dual IA** — clear For fathers vs For organizations without cluttering the father path.  
5. **Org trust density** — verify serial, claims, cohort, professional spacing on org/facilitator pages.  
6. **Film-first** — course/player surfaces assume Vimeo; no “written session is the real product” framing on touched copy.  
7. **Mobile** — Log in / My Plan / primary CTA thumb-reachable; MENU a11y retained.  
8. **Sponsorship doctrine** — Sponsor = fund Certified Organization / facilitator credentialing. Never “sponsor a man.”  
9. **Copy hygiene** — short FORGE sentences; minimize em dashes and parallel “not X, it’s Y” rhetoric.

---

## What changed

### Design system
- Spacing tokens (`--s-*`), elevation (`--elev-*`), card shadow, `btn-ghost` / `btn-lg`.
- Focus/input polish (yellow focus ring on fields).
- Utilities: `.trust-bar`, `.next-action`, `.split-audience`, `.progress-rail`, `.org-panel`, `.hiw-rail`, `.verify-*`, `.social-proof`, `.foot-verify`.
- `dash.css` expanded: denser tables, sticky headers, empty states, professional panels.

### Global chrome
- Public nav: Profile, Courses, For organizations, Log in (drawer); primary **Start Profile**.
- App nav: Dashboard, My Plan, Courses, Circle; Account chip; My Plan in nav-right on desktop.
- Thin trust bar under public nav: Free for participants · Facilitator-supported · Verifiable certificate · Verify a serial.
- Footer: Measure / Train / Organizations / Company; verify link prominent (`foot-verify`).

### Father path
- Homepage: single Father CTA retained; hero progress rail; How it works as connected rail; social proof without fake stats; film-first course cards; sponsor CTA retargeted to org certification.
- Profile landing: calmer start, time honesty, “what you’ll get.”
- Certificates: film-first card language; Where to start kept; Open the course CTAs.
- Login: password-first, yellow primary, short subcopy.

### Org surfaces
- Organizations: primary **Bring a cohort**; link to sponsor certification.
- Facilitators: primary **Get credentialed**; link to sponsor credentialing.
- Verify: confidence copy, large serial input, clear Valid / Suspended / Revoked / Not found states.
- **sponsor.html**: fully rewritten for org certification funding (site year, facilitator credential). gift.html stays dark (`SHOW_GIFT=False`); source title notes resting / points funders to org sponsorship.

### App dashboards
- Participant dashboard: sticky **Next action** band; courses above report; journey rail retained; empty/signed-out recovery CTAs.
- dash.css ready for denser admin/org/facilitator tables.

### Coursework
- Player copy film-first (Vimeo assumed; session guide as support, not primary product).

---

## File list

| Area | Files |
| --- | --- |
| CSS | `assets/css/forge.css`, `assets/css/dash.css` |
| Builders | `build_pages.py` (nav, footer, trust bar, index, profile, certificates, organizations, facilitators, verify, sponsor, login, dashboard, gift metadata) |
| JS | `assets/js/dashboard.js`, `assets/js/coursework.js`, `assets/js/help.js` |
| Generated | All pages from `python3 build_pages.py` / `python3 build_dashboards.py` |
| Docs | `/workspace/audit/FLAGSHIP-DESIGN-PASS.md` |

---

## Remaining bets (post–Aug 16)

1. **Live Vimeo IDs** — hard gate; replace placeholders with real films and smoke the player.  
2. **Lifecycle email** — welcome + weekly soft opt-out; largest retention gap.  
3. **Facilitator “your man signed up” alert** — closes claim loop.  
4. **Certification sponsorship checkout** — Stripe live for org/facilitator funding tiers.  
5. **Course page bodies** — many session pages still carry legacy “FILM IN PRODUCTION” slots; polish to film-first as IDs land (avoid mass rewrite pre-launch).  
6. **A/B hero** — single CTA vs prior dual-intent.  
7. **Court packet / verify share sheet** — one-tap proof after first certificate.  
8. **Circles only via cohort/claim** — deepen facilitator-opened rooms.

---

## Process notes

- HTML regenerated via builders after edits.  
- Touched JS syntax-checked with `node --check`.  
- Dark-flagged stubs (gift, stories, employers, gatherings, military) follow `SHOW_*`.  
- No commit or push from the agent.
