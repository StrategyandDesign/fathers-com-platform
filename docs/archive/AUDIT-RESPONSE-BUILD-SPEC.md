# Response Ledger: BUILD-SPEC (2026-08-11)
Every spec item, its status after v4.12.0, and its owner. Statuses:
DONE (shipped in v4.12.0), STAGED (code in repo, Alon deploys), CLOSED-PRIOR
(already true before the spec; snapshot blindness), DEFERRED (real, owned,
scheduled), CALL (a leadership decision the build does not preempt).

## Section 1, server authority
1.3.1 answer-key view: STAGED (view in migration; client on the view now).
1.3.2 server grading: STAGED (checkpoint_submit function written; client calls it; no client grading remains).
1.3.3 write-deny RLS: STAGED (migration section 5; Alon reconciles with certificate_accountability.sql).
1.3.4 heartbeat + anti-fraud: STAGED (progress_beat function; client posts beats; no client progress writes remain).
1.3.5 hours as computation: DEFERRED (backend; interim rule from 4.1 shipped instead: the number is gone).
1.3.6 award state machine + audit: STAGED (submit_award function + award_audit table).
1.3.7 record_integrity + verify states: DONE on the verify surface (issued, suspended, revoked, not-found all render); STAGED in data (columns in migration; public_certificates needs status exposed).
Forgery gate (outside engineer fails with devtools): DEFERRED until functions deploy; the client paths that made forgery trivial are gone now.

## Section 2, delivery
2.2.1 raw MP4 deleted: DONE.
2.2.2 signed playback: DEFERRED, owner Micah/Alon (Vimeo tier or Mux decision).
2.2.3 watermarking: DEFERRED with 2.2.2.
2.2.4 PiP and speed disabled: DONE (player params and allow list).
2.3 Profile A low-data, Profile B kiosk/PIN/PWA, network sheet: sheet DONE (docs/NETWORK-REQUIREMENTS.md); kiosk, PIN auth, PWA DEFERRED, owner Alon, pilot-gated.
2.3 Profile C: CALL adopted, nothing promised anywhere on the site.
2.4 facilitator console: DEFERRED, the P1 build after functions deploy; absence alert first.

## Section 3, KEEPs
All nine confirmed untouched. KEEP 1 headline promotion already live since v4.11.x.

## Section 4, claims
4.1 hours: DONE per the spec's interim rule; the number is deleted platform-wide, session counts and facilitator attestation replace it. The three-number certificate record lands with the backend hours computation.
4.2 instrument: DONE (canonical spec block on research.html; every other surface references it; build fails on stray item counts).
4.3 norms: DONE (all norm-referenced claims removed; On Norms statement published; headlines re-cut to "you can train"; checker enforces).
4.4 overlays: DONE (deleted, honest capability statement in place, funder bullet gone, residual clause excised).
4.5 anger framing: DONE (reframe, exclusion blocks on certificates and organizations, orderable softened).
4.6 testimonial: DONE (deleted, no replacement).
4.7 rating: DONE (FAQ answer replaced; directory dark behind SHOW_DIRECTORY).
4.8 terms section 6: DONE (free model stated; full legal package remains with counsel).

## Section 5, faith surface separation
5.1 faith toggle: DONE at zero cost; audit found no faith code in the assessment, the FAQ promised a toggle that never existed. FAQ replaced with the secular answer. Partner-agreement clause: DEFERRED to the counsel package.
5.2 term replacements: DONE, all rows, including page titles, social meta, and the dashboards builder.
5.3 register guide: adopted into POSITIONING.

## Section 6, data and consent
6.1 legal-process paragraph: DONE on privacy.html.
6.2 free-text minimization: hint DONE on every reflective input; purge-at-issuance DEFERRED, owner Alon.
6.3 ID collection: DONE as copy (pilot is facilitator-attested, independent ID off); vendor path DEFERRED.
6.4 referred-participant consent screen + Profile-optional completion: DEFERRED, owner Micah/Alon; a real product capability, pilot-gated.
6.5 shared-device privacy: DEFERRED with kiosk mode.

## Section 7, legal
7.1-7.4, 7.6, 7.7: DEFERRED, owner Cameron Brewer; the spec's list is the engagement scope.
7.5 triage PDF: CLOSED-PRIOR. The file exists in the repo at assets/docs/ and shipped in batch 31; the spec audited a diff batch, not the tree.

## Section 8, retention and MVP cuts
8.1 levers and 8.2 instrumentation: adopted as the pilot playbook; targets to be declared in writing before enrollment opens, owner Micah.
8.3 cuts: SHOW_DIRECTORY and SHOW_GIFT shipped dark. Membership repriced as founding-supporter with the library state disclosed at both point-of-sale surfaces. Circles and the Manhood Track chooser: CALL. Both are one flag from dark in the established pattern; they are live, functional, navigation-level surfaces, so the build does not amputate them without an explicit word.

## Sections 9-11
The 14-week sequence, launch checklist, and one-line test are adopted; the checklist's static-surface rows are green as of v4.12.0, the backend rows go green when Alon deploys the staged work.
