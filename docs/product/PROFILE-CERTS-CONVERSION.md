# Profile / Certificates conversion pass

**Branch:** `feat/profile-certs-excitement`  
**Date:** 2026-08-12 (America/Chicago)  
**Launch:** Aug 16 film-first  
**Constraint:** No commit/push from this pass.

## Why

Profile and Courses were org-proof and sparse. Fathers need a voluntary, dignified path that sells empowerment and shows what the experience feels like before they click Begin. Organizations still get trust (verify, serial, claims), but that proof sits after the catalog.

## Doctrine (locked)

- Default: **facilitator-supported self-paced film**.
- Certified Facilitator available for Q&A, insight, accountability via claim.
- Not required to co-watch.
- Optional live cohort mode may exist later for some orgs. Cohort language OK when framed as program grouping or optional live mode.

## What changed

### `profile.html` (nochrome, richer intro)
- Side photo (`hero-02.jpg`) via `.ks-intro-visual`.
- Headline: know where you stand / train what matters. ~20 min honesty kept.
- Static sample Likert item (clearly labeled example).
- Four dimension cards with one-line meanings.
- What happens after: scores → plan → film courses (voluntary, free start; program may claim later).
- Big Begin CTA + resume note. Privacy / not-clinical fine print kept.
- JS wiring unchanged (`ksIntro` / `keystone` / `sessionStorage`).

### `certificates.html` (father-first)
- Hero leads with film training + free Profile CTA; verify is secondary.
- Short 01/02/03 path strip instead of wall-of-proof above catalog.
- Course cards: photo headers (CHP=`hero-03`, Steady=`action-01`, Same Team=`community-02`, Fundamentals=`hero-01`), Film course pill + session count.
- First 3 sessions visible; full list in details. Session preview callouts for CHP and Steady.
- Where to start kept. Verify pillars moved below catalog.
- Copy: self-paced, facilitator-supported / available for questions. Optional live cohort noted for programs.

### Course session pages (light)
- CHP / Steady / Same Team: visual billboard, film-course eyebrow, Start with free Profile CTA.
- Opening copy shifted off "facilitator-led cohort" / written-session-as-product framing.

### CSS (`forge.css`)
- `.ks-intro-visual`, `.dim-grid`, `.sample-item`, `.course-card-media`, `.sess-preview-row`, `.course-billboard`, related helpers. Dark/light via existing tokens.

## Hard rules honored
- No em dashes in touched copy.
- Sponsorship = org certification only.
- Film-first language.
- No invented stats/testimonials; photos from `assets/img/photos/`.
- Edit `build_pages.py` (+ CSS), then `python3 build_pages.py`. No commit.

## Build
```
python3 build_pages.py
```
