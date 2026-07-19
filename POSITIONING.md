# POSITIONING.md — v4.0 Reposition (FC-POS-002)

Decision record for the July 2026 reposition. This file is the authority for copy
and pricing questions. Facts are labeled facts. Hypotheses are labeled hypotheses.

## 1. The inversion

- NCF certifies institutions and people. Participants complete free.
- **Certified Organization**: a site credential. Annual, published, revocable.
- **Certified Facilitator**: a personal credential. Examined, supervised, renewed annually, published, revocable. It belongs to the person and travels with them.
- **Certificate of Completion**: the participant document. Earned, serialed, signed by Dr. Ken Canfield and the leading Certified Facilitator, publicly verifiable, and free to the man. Always.
- "Certified / certification" is reserved for organizations and facilitators. The man's document uses "certificate" but never "certified." The grammar carries the tier.

## 2. Naming decision (research basis)

Industry pattern is two-tier: exam-based, renewable credentials use "Certified"
(Oracle Certified Professional, Salesforce Certified, Google Cloud Certified),
while course-level awards are "certificates of completion" (Oracle Learning
issues completion certificates by that name; Coursera and LinkedIn Learning use
the same term). Courts also ask for a "certificate of completion" by name.

**Decision**: the participant document is the **Certificate of Completion**.
"Record of Completion" was workable but nonstandard; the chosen name requires
zero translation in the two rooms that matter, courts and HR. On-document
header: "Certificate of Completion · National Center for Fathering."

## 3. Facilitator credential (research basis)

- National Fatherhood Initiative (24:7 Dad, InsideOut Dad): kits $659–$899, facilitator training optional ("available but not required"), on-demand webinar, certificate of completion for the training, no exam, no renewal, no registry, no revocation.
- Prepare/Enrich: facilitator certification required to administer the assessment, one-day training around $155–$300 including the kit, $35 per couple assessment fee, 200,000+ facilitator network.

**Decision**: NCF sets the ceiling the field lacks. Certified Facilitator =
facilitator course + exam + supervised first cohort + code of conduct + annual
renewal + public registry with revocation. Nobody in the fatherhood curriculum
market runs a true certification regime. That gap is the moat.

## 4. Launch pricing (labeled on-site as launch pricing, pends partner interviews)

| Item | Price | Notes |
| --- | --- | --- |
| Participant: profile, courses, Certificate of Completion | $0 | Always. Non-negotiable. |
| Certified Facilitator | $349 initial, $99/yr renewal | Above Prepare/Enrich's one-day price because ours includes exam + supervision + registry; far below clinical-grade practitioner training. |
| Certified Organization | $1,500 per site per year | Unlimited cohorts at the site. Efficacy Report included. Multi-site custom. |
| Seat sponsorship | $120 per man | Funds membership-year + printed materials through Certified Organizations. Donor never sees program names. |
| Library membership | $120/yr (beta $79 founding) | Optional B2C. Never gates courses or certificates. |

## 5. Military surface

`SHOW_MILITARY = False` in build_pages.py darkens the entire veteran vertical:
pages ungated from generation, stale files removed, routes stripped from nav and
footer, the served gate in keystone-ui.js passes through, and the plan-page
veteran and Legacy Archive cards are removed. Nothing is deleted from the
schema; `profiles.served` and the voice tables stay dormant. Flipping the flag
plus a copy pass restores the vertical (ADR-4 posture).

## 6. Coming Home Present

Universalized: "presence after time away, whatever kept you away." No branch by
population. The deployment cut of the course can return behind the military flag.

## 7. The Keystone Manhood Profile (KMP-0.1-draft)

File: `assets/js/keystone-manhood-data.js`. Status: draft item bank, complete.

- Mirrors the Father Profile exactly: 128 items, 26 scales, 3 sections, identical per-scale item counts ([6,6,6,6,7,4,5,5,6,5] / [4,5,6,4,6,4,6,6,5,4,4,4] / [4,3,4,3]), identical response scales (likert5 accuracy, likert5 quality, likert7 satisfaction), identical scoring machinery. Equal length, equal weighting, equal scoring by construction, per the design requirement.
- Four headline dimensions parallel Involvement/Consistency/Awareness/Nurturance: **Presence, Discipline, Respect, Service.** Mapping from the brief: present→Presence; productive+disciplined→Discipline (conscientiousness research treats industriousness and self-discipline as one trait domain, which is why they merge); respectful→Respect; servant-hearted+supportive→Service.
- Research basis: the field's dominant instruments (CMNI, MRNI) measure conformity to traditional norms framed mostly as risk; the positive-masculinity framework (Kiselica & Englar-Carlson) names respect, hard work, protecting, caring, and serving as the prosocial core, and no dominant validated strengths-based instrument exists. KMP takes that open lane, alongside self-control/conscientiousness outcome research, generativity research, and adult-development findings on relationships.
- **Gate**: deploys only after Dr. Ken Canfield's psychometric sign-off. No norms exist (`norms_n: 0`); no norm-referenced claims until a norming study supports them. Wiring the dual-instrument selection into profile.html is next-sprint work behind that gate.

## 8. Verified discrepancies logged for Dr. Canfield (do not silently edit)

- Marketing says "normed on 9,232 fathers." `data/keystone_instrument.json` carries `norms_n: 2066`. Both trace to the Technical Bulletin. One number is wrong or they describe different samples. Resolve before the next efficacy conversation.
- "130 items" appeared in marketing copy; the instrument file contains 128. Site copy now says 128 (verifiable in-file). The instrument JSON description string still says 130 and should be corrected at source with Dr. Canfield's confirmation.
- LAUNCH.md already flags demo scoring: replace before any claim of validity. Unchanged, still true.

## 9. Language system

Participant-facing copy never uses: rehab, recovery, treatment, sobriety,
clinical, patient, inmate, facility, discharge, or any population label. The
certificate and the public verification page never name the referring
organization. Organization-facing pages may name verticals plainly (residential
and recovery, reentry and alternative sentencing, courts and probation).

No clinical information is stored on this platform. Where 42 CFR Part 2 applies
to a partner, the partner kit carries the QSOA template; the platform never
receives Part 2 data. The participant owns his account after discharge.

## 10. Design partner: Returning Home, Inc. (returninghomenwa.com)

Facts from their site: Christ-centered ministry, founded 2016. CAP is a 120-day
residential alternative-sentencing placement in Huntsville for men from
Washington and Madison County courts, with an employment requirement. CRI (2025)
is a residential substance abuse treatment program in Fayetteville using a
therapeutic community model for pre-trial men from the Washington County jail,
vetted by the Sheriff's Office.

Fit: a 12-lesson course at one session per week is 84 days, inside the 120-day
CAP episode with margin. CRI is Part 2-adjacent: QSOA template applies, no
clinical data ever crosses to the platform, the program name never appears on a
man's public record, and his account follows him home at discharge. Returning
Home is explicitly Christ-centered; NCF curriculum remains secular-default with
the faith lens available, which fits them without binding any other partner.

Hypothesis to validate in the pilot: certificate ceremony before discharge
measurably lifts completion; aftercare continuation measurably lifts retention
signals in the Continuity Overlay.

## 11. Role naming (display layer)

DB role keys are unchanged. Display names reposition: member → Participant,
circle_leader → Certified Facilitator (Facilitator Desk), org_admin → Certified
Organization admin, instructor → NCF curriculum staff, admin → NCF Registrar.
See ROLES.md.
