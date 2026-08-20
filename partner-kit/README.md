# Partner kit

Everything a Certified Organization needs on paper, generated from the repo so
URLs and language stay true to doctrine. POSITIONING.md sections 9 and 16
govern every word in here.

## Contents
| File | Audience | Purpose |
| --- | --- | --- |
| make_inserts.py | NCF | Generates the two print PDFs into partner-kit/dist/ |
| dist/parent-insert-keystone.pdf | The father | Front door to the free Profile. Participant-facing: section 9 language rules apply, no population labels, no norms count until resolved |
| dist/caseworker-onepager-certificate.pdf | Caseworkers, parent counsel, ad litem, CASA, court staff | The certificate explained, ten-second verification, suggested case plan language |
| case-plan-language.md | Professionals | The quotable case plan sentence, plain text for copy and paste |
| qsoa-template.md | Counsel | Draft Qualified Service Organization Agreement skeleton for Part 2 partners. COUNSEL REVIEW REQUIRED before any use |
| ../docs/consent-returning-home.md | Pilot lane only | Pseudonymized pilot consent. Never used in the certification lane |
| facilitator-quickstart.md, dist/facilitator-quickstart.pdf | Certified Facilitators | The retention rhythm: session one beats, weekly cadence, the same-day call, the ceremony |
| ceremony-script.md | Facilitators | Ten-minute certificate ceremony, run before program exit |
| supervision-checklist.md | NCF supervisors | The supervised first cohort as a coaching instrument |
| org-admin-quickstart.md | Org admins | Seats, cohort funding, where incentive money goes, the Efficacy Report |
| engine-license-outline.md | Counsel | Governance skeleton for licensing the engine to an outside authority. COUNSEL REVIEW REQUIRED |
| funding-map.md | Org admins, development staff | Federal, reentry, and settlement funding streams, what they pay for, budget-line mapping |
| fundraising-one-pager.md | Donors, foundations | One-page founding-gift leave-behind. Sources 2018–2026 only |
| fundraising-brief.md | Donors, development staff | Market brief, $260k split, ten-minute talk track, numbered sources |
| facilitator-triage-and-referral.md | Certified Facilitators | Distress signs, the same-day warm handoff, the education-line boundary, and the court-order rule for rebuilding trust |

## Regenerate
    python3 partner-kit/make_inserts.py

The script imports SITE_URL from build_pages.py, so the profile and verify URLs
and both QR codes follow the canonical domain automatically (docs/DOMAIN.md).
PDFs land in partner-kit/dist/, which is not committed; print from a fresh run.

## Function checklist
1. Runs offline against the repo alone (reportlab only).
2. Both PDFs are one page, letter, with scannable QR codes.
3. Parent insert passes the section 9 vocabulary scan (the script asserts it).
4. No norms count appears anywhere (POSITIONING.md 8).
