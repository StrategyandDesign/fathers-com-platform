# POSITIONING.md: v4.0 Reposition (FC-POS-002)

Decision record for the July 2026 reposition. This file is the authority for copy
and pricing questions. Facts are labeled facts. Hypotheses are labeled hypotheses.

## 1. The inversion

- NCF certifies institutions and people. Participants complete free.
- **Certified Organization**: a site credential. Annual, published, revocable.
- **Certified Facilitator**: a personal credential. Examined, supervised, renewed annually, published, revocable. It belongs to the person and travels with them.
- **Certificate of Completion**: the participant document. Earned, serialed, signed by Dr. Ken Canfield and your Certified Facilitator (or the Certified Facilitator who claimed your seat), publicly verifiable, and free to the man. Always.
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
| Seat sponsorship ($120/man) | Retired | Do not use. Sponsorship funds Certified Organization status and facilitator credentialing only, never a man seat or free-seat gift. |
| Library membership | $79 founding / $120 after | Optional B2C support for film production (Founding Library Member). Never call this sponsor. Never said to fund free seats. Never gates courses or certificates. |

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

Audience and setting words are allowed sitewide when accurate: rehab, recovery,
treatment, sobriety, clinical, patient, inmate, facility, discharge, and plain
population labels that describe who a course or partner serves. Coming Home and
other rehab-first / reentry copy may name those settings on participant-facing
pages. Prefer concrete setting language over euphemism.

Still avoid clinical-authority overclaim (section 16): we certify education; we
never diagnose, screen, treat, counsel, or provide therapy, and we never use
those words about ourselves. The Keystone Profile remains an educational
self-report, never a clinical instrument.

The certificate and the public verification page never name the referring
organization. Organization-facing pages may name verticals plainly (residential
and recovery, reentry and alternative sentencing, courts and probation).

No clinical information is stored on this platform. Where 42 CFR Part 2 applies
to a partner, the partner kit carries the QSOA template; the platform never
receives Part 2 data. The participant owns his account after discharge.



## 9a. Sponsorship / Library vocabulary (locked)

- **Sponsor / sponsorship / gift**: ONLY funding Certified Organization status and facilitator credentialing. Nav "Sponsor" and footer "Sponsor certification" point at `sponsor.html`.
- **Library membership**: optional B2C support for film production. UI: Founding Library Member at $79, then $120. Never call this sponsor. Never say it funds free seats. Courses stay free either way. Checkout CTA: Support film production → `checkout.html`.
- **Claimed seat**: operational enrollment. Certificate signer language: "your Certified Facilitator" or "who claimed your seat." Never "sponsored your seat."
- **Seat sponsorship ($120/man)**: retired. Do not revive in copy or partner materials.

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

## 12. Supabase changes (v4.0, revised in the claims pass)

One migration: `supabase/migrations/20260718090000_keystone_v4_0_reposition.sql`.

What it does: zeroes participant course prices and sets the default to 0
(the checkout function reads price truth from the database); creates
`participant_claims`, the sole enrollment path; adds `claim_id` to
`certificate_enrollments`; updates the flagship film-library entry to five
sessions; creates the certification registry (organization_certifications,
facilitator_credentials) with public verification views that mirror
public_certificates and always expose status, including suspended and revoked.

Coupons are gone. The migration does not create them, the checkout function
no longer reads them, and no UI offers them. Hand-made coupon tables in
production can sit inert or be dropped at the owner's discretion.

Edge function redeploys ARE required this pass: `supabase functions deploy
checkout` and `supabase functions deploy checkout-webhook`, after `supabase
db push`. The soft-launch "self enroll" RLS policy from
sql-archive/seed_certificate_courses.sql should be DROPPED when convenient:
with claims as the gate, a client-side insert path around the checkout
function is a hole, not a convenience.

Serial conventions: FC-2026-###### for Certificates of Completion,
NCF-F-2026-#### for facilitators, NCF-O-2026-#### for organizations.

## 13. Claims (the enrollment gate)

A participant can only participate in a course when an active claim exists
for him, placed by a Certified Facilitator or a Certified Organization. The
claim is by the email he signs in with (or his user id once attached).
Facilitators place and release claims from the Facilitator Desk. The free
film library, the Keystone Profile, and the twelve-week plan remain open to
every man; the three courses and the Certificate of Completion flow through
claims. Enrollment records carry claim_id so completions roll up to cohorts.

## 14. Course structure

Five videos per course, each ending in a Checkpoint, closing with the
written Final Q&A the man submits and his facilitator reads at approval. The
admin console states the standard and warns on publishing a course that is
not at five videos. Session films run roughly fifteen to twenty minutes so a
session fits a working man's evening; verified hours on the certificate
cover film, workbook, checkpoints, and the final.

## 15. Auth coherence and the dashboard reveal

One auth model: email and password, everywhere. The login card has two modes,
Sign in and Create account; the create link toggles the card instead of
dropping a man into the assessment. Account creation routes to the Profile as
an invitation, with the account already existing. Both mid-assessment save
and post-results save create the account with a password; the magic link is
retired platform-wide (signInWithOtp removed from the client). If Supabase
Auth has Confirm email enabled, the flows say so and results persist locally
until the first sign-in attaches them (FC.syncKeystone).

Signed-in state is legible: the nav shows My Plan plus Sign out, and the
account page has a visible Sign out button. Dashboards keep their own.

The completion moment celebrates before it reports: a finish header, the
overall counting up, then the full 26 scales, then one primary action: Open
your dashboard. plan.html opens with the Keystone Dashboard: the overall as
a drawn ring, the four dimensions (Involvement, Consistency, Awareness,
Nurturance) animating in, strength and growth chips, movement since run one,
the retake date, and a single next action chosen from where he actually is
(start free course, continue, or see the certificate). Arriving with
reveal=1 shows the congratulations band once, then the URL cleans itself.
The rail's baseline card hides when the hero renders so numbers appear once.

Orphans removed this pass: the superseded keystone.js controller and the
magic-link helper it used.

## 16. The education line (adopted 2026-08-10)

NCF is an education and certification authority. Nothing on this platform crosses
into licensed territory. Verified by vocabulary scan of every generated page on
2026-08-10: the live surface carries zero clinical-authority language.

1. We certify education. We never diagnose, screen, treat, counsel, or provide
   therapy, and we never use those words about ourselves.
2. The Keystone Profile is an educational self-report profile of fathering
   practice. Never a clinical instrument, never a screening, never a test of
   mental health. Interpretation bands use practice language, never symptom
   language.
3. Certified Facilitators lead courses. The credential certifies facilitation of
   NCF curriculum only. A facilitator who holds a counseling license does not act
   under it here, and our copy never implies he does.
4. The Efficacy Report reports educational outcomes: completion, movement on
   practice domains, retention signals. Never clinical outcomes. Never a claim to
   reduce relapse, depression, or any diagnosis.
5. No clinical information is stored on the platform (section 9). The QSOA
   template lives in the partner kit; the platform never receives Part 2 data.
6. Anger content is steadiness education. Never "anger management" as a court
   category, and never positioned to satisfy batterer-intervention requirements,
   a regulated program class in most states. Whether a certificate satisfies any
   requirement is decided by that body (the live FAQ posture).
7. The Legacy Archive (voice.html) is testimonial recording only. Recordings are
   never analyzed for health, mood, or biomarker signals.
8. Health-adjacent modules, if ever added, are general wellness education, not
   screening or advice.
9. Research stays in the pseudonymized pilot lane, which already carries Subpart
   C posture (subpart_c_determination). The service lane makes no research
   claims.
10. When SHOW_MILITARY flips, the veteran pages get this same scrub first. They
    currently contain "diagnosis" and "treat" vocabulary.

Counsel confirms points 2 and 6 once before court-facing distribution scales.

## 17. Fourth course: co-parenting (decided 2026-08-10)

The universal need map confirms one gap in the slate: co-parenting and
communication with the mother of a man's children. Both incumbent curricula
carry the topic; in residential settings 77 percent of fathers wanted fatherhood
and co-parenting sessions. Decision: a fourth course enters the catalog as
COMING SOON, not enrollable, no waitlist. Working title "Same Team," pending
final naming. Participant copy stays label-free per section 9. Build order:
after Coming Home Present.

## 18. The market evidence record (adopted 2026-08-10)

Verdicts from the commissioned demand review, logged as doctrine. Every rule
below is enforced by tools/check_release.py where a scanner can enforce it.

1. Confirmed by the evidence: programs buy curriculum and facilitator
   training (incumbent kits publish at $479 to $899, facilitator training at
   $199 to $450 per person); staff training demand is documented in the
   federal implementation studies; courts and child welfare agencies require
   completion certificates in case plans; fathers ask for this content; and
   funders demand outcome reporting. Both incumbent curricula are rated Does
   Not Currently Meet Criteria on the Title IV-E Prevention Services
   Clearinghouse as of the July 2025 review. The evidence bar is open ground.
2. Contradicted: any claim of category-first verification. QR-verified,
   court-checkable certificates already sell to parents at $19.95 to $95.
   The claim rule: never "first" or "only" about verification. The
   defensible set, exactly four items: first within evidence-based
   fatherhood curricula; revocation always shown, which no competitor
   advertises; free to the man; earned in a facilitator-supported film course.
3. Unproven: the recurring model. No incumbent publishes an annual site
   license or facilitator renewal. The $1,500 per site per year and $99
   renewal stand as a priced hypothesis. Benchmarks: first-cycle renewal
   above 70 percent validates the model; below 40 percent converts it to
   one-time-plus-training. The annual fee is always sold as what a kit
   cannot include: the registry listing, revocation authority, facilitator
   renewals, and the Efficacy Report.
4. The norms language rule: until section 8 resolves, printed norming
   language is magnitude only, "thousands of fathers," never a count. In
   code, counts print only when an instrument carries norms_printable set
   true. The public lineage line ties the Keystone Profile to the Personal
   Fathering Profile research program of Dr. Ken Canfield, the documented
   instrument of record.
5. The evidence claims rule: no page prints "evidence-based" or any rating
   claim until a Clearinghouse rating exists. The Efficacy Report is
   described as built for the evidence bar, never as proof already earned.
6. The binding constraint in the federal evaluations is recruitment and
   retention, not price. Facilitator enablement and recruitment materials
   outrank verification features in build order.
7. The 77 percent figure (fathers in residential treatment wanting paternity
   and co-parenting sessions) cites Int. J. Environ. Res. Public Health
   2020, 17(3):1051, a peer-reviewed review carrying it as a secondary
   citation with the primary sample unstated. Cite it exactly this way,
   internally only.

## 19. Receptivity findings adopted (2026-08-10)

The soldier-father receptivity review is adopted as doctrine. What changed:

1. The framing lexicon is law on military-facing surfaces: training,
   readiness, skills, tools. Clinical vocabulary is banned there even as
   denial. The dark military bodies were scrubbed to this standard, and the
   release checker now bans counseling, behavioral health, and support
   group everywhere participant-facing.
2. Completion mode is a per-course parameter: graded_final for court-facing
   certificates, checkpoint for voluntary military cohorts. The certificate
   records its mode. Doctrine: the credential's meaning never varies; only
   the closing instrument does.
3. Coming Home Present carries the module fathers asked for by name:
   catching up on how your child grew while you were away. Parenting
   confidence runs as a thread through the slate.
4. The triage-and-referral protocol is part of the facilitator kit and is
   mandatory wherever the trauma load is high: residential, reentry, and
   any military cohort. A fathering course is never trauma treatment, and
   the warm handoff is part of the facilitator's job.
5. The IDF path is partner-led or it does not happen: Israeli organization,
   Hebrew, reservist-peer facilitators, faith framing stripped from
   delivered materials, clinical referral named before cohort one.
   platform_verticals records locale and rtl for this purpose.
6. docs/MILITARY-READINESS.md holds the full spec and the benchmarks.
   The gates in section 15 posture are unchanged: rehabilitation proof
   opens this door, nothing else.

## 20. Course publication and the deploy punch list (2026-08-11)

Curriculum Revision 3 is adopted: Coming Home Present runs eight sessions,
Steady Under Pressure six, Same Team six, sixty minutes each, completed
before the return, every practice on two tracks. All written sessions are
published on the platform with film-slot placeholders (div.video-slot,
data-video keys) awaiting the uploads. The deploy audit's punch list is
executed in v4.11.0: the verify page leak removed, legal drafts finalized
in copy (counsel review remains the external gate), demo data neutralized
and labeled, "validated" softened to research-based with printed sources,
and the education line published on the organizations, facilitators, and
profile pages with a downloadable referral protocol PDF. The funding
proposal's course hours must sync to 8/6/6 at its next revision.

## 21. The Man Before You, staged dark (2026-08-11)

The Manhood Track course is specced (Rev 1, gated on Dr. Canfield) and fully
staged behind SHOW_MANHOOD_COURSE=False: the complete six-session page, the
catalog card, the detail CTA mapping, and the track fit line all publish on a
one-line flip. No public surface mentions the course while the flag is dark,
per the retired-waitlist doctrine: we announce work when it is live, not
before. Adoption day is a flag flip, a version bump, and a changelog entry.

## 22. The build-spec adoption (v4.12.0, 2026-08-11)

An external-style build specification against the v4.11.9 snapshot was
audited, verified against the full tree, and executed. What it changed in
doctrine: the record's authority moves to the server (the browser reports,
the server decides); every hours figure must trace to a measured quantity,
and until the measurement exists the number does not appear; instrument
numbers live in exactly one canonical block; norm-referenced claims are
unavailable until a technical summary exists, and the checker enforces all
of it. The faith surface separation is complete on participant and
institutional pages. The register rule stands: no outcome promises in
participant copy, ever. Response ledger: docs/AUDIT-RESPONSE-BUILD-SPEC.md.

## 23. Scale architecture decisions (AUDIT-V41 WP-M, 2026-08-11)

Adopted as architecture decision records. Tenancy is data, not build flags:
every operational row grows an org_id, cohorts belong to orgs, facilitator
roles scope to orgs, and deployment-specific behavior (courses, language,
serial prefix) is org configuration in the database, so the Guard onboards
as a row, not a build. Serial authorities: public_certificates carries
issuing_authority now, dark, so a partner signing spine is a data flip.
Localization: a minimal i18n seam ships with English only; RTL is a data
flip plus a translation file when a partner-led pass exists, and the courses
are never machine-translated. Data residency: one repo, one schema, one
Supabase project per jurisdiction; the US project never holds IDF
participant data, and nobody saves time later by pointing Israel at the US
database. Sequence discipline stands: SHOW_MILITARY stays dark until the
Returning Home pilot produces completion evidence, and the IDF step remains
partner-led with counsel and board review.
