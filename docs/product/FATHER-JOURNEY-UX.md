# Father journey UX (Profile → Report → Plan → Courses)

## Target experience

One spine. One next move. Destination named. Proof at the end.

1. **Profile** — conversion intro, then track choice, then items. Do not skip the intro.
2. **Report** — celebrate strength + name the focus. Primary CTA: open the twelve-week plan. Full 26 scales stay behind a fold.
3. **Plan** — this week first. Then one matched film course. Progress second. Extra Profile detail collapsed.
4. **Courses** — after plan, not a cold catalog first. Show the course matched to his focus, then browse all. Enrollment stays free when a Certified Facilitator claims his seat. Browse and get excited before claim.
5. **Dashboard** — home base, not a fifth stage. Next action + matched course + collapsed report.

## Necessary vs creep

**Necessary**
- Journey rail: Profile → Report → Plan → Courses
- One primary CTA per screen
- This week's actions with when/where cues
- One recommended course tied to focus
- Certificate as earned proof (quiet)

**Creep (cut or collapse)**
- Competing cards (strength + tending + certificate + classes) above the fold on Plan
- "Courses unlock" language that blocks excitement before claim
- Circles / Stories on the critical path for new fathers
- Retake Profile as a primary action
- Catalog-first courses with no personalization

## Architecture answer

Courses stay a **separate page** (`certificates.html` + course billboards), but Plan and Dashboard **embed a matched-course card** that deep-links into the right course. After plan, he should not wonder "what now?" — the next film is obvious.

## Copy rules

- Destination without hype: count-on-able, presence, steadiness, warmth
- Facilitator-supported self-paced film (not co-watch required)
- Minimize dashes and AI-slop punctuation

## Verified-only completion
Courses may be previewed freely. A Certificate of Completion and public serial exist only when a Certified Facilitator or Certified Organization claims the man's seat. See `docs/VERIFIED-COMPLETION.md`.
