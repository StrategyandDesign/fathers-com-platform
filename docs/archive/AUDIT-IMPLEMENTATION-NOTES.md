# AUDIT-IMPLEMENTATION-NOTES (2026-08-12)

Branch: `audit/ux-security-hardening`. No commit / push / PR from this pass.

## Files changed

### Security / edge
- `supabase/functions/_shared/cors.ts` — allowlist helper (`corsFor` / `allowedOrigin`)
- `supabase/functions/send-email/index.ts` — JWT or INTERNAL_FUNCTION_SECRET; template allowlist; no arbitrary html without secret
- `supabase/functions/issue-certificate/index.ts` — Bearer JWT + admin/content_reviewer; CORS; requirement checks kept
- `supabase/functions/checkout/index.ts` — CORS allowlist
- `supabase/functions/esign-bridge/index.ts` — CORS allowlist
- `supabase/functions/progress_beat/index.ts` — CORS allowlist
- `supabase/functions/checkpoint_submit/index.ts` — CORS allowlist
- `supabase/functions/submit_award/index.ts` — CORS allowlist
- `supabase/functions/review_award/index.ts` — CORS allowlist
- `supabase/functions/verify_serial/index.ts` — CORS allowlist
- `.github/workflows/ci.yml` — created (syntax + check_release + optional e2e)

### UX / retention
- `assets/js/keystone-ui.js` — password create/sign-in for save-later + save-plan
- `assets/js/keystone-report.js` — report save path uses password (claim token kept)
- `assets/js/keystone.js` — legacy demo account screen uses password
- `assets/js/supabase-client.js` — seed email_weekly/email_course true on signup
- `assets/js/enroll.js` — claim_required recovery CTAs
- `assets/js/account-prefs.js` — retention defaults + soft opt-out copy
- `assets/js/circles.js` — remove first-row auto-join; empty state
- `assets/js/dashboard.js` — unclaimed next-action prefers plan / facilitator wait

### Docs
- `docs/AUDIT-FIXES-2026-08-12.md` — summary + Alon deploy checklist
- `AUDIT-IMPLEMENTATION-NOTES.md` — this file

## Still needs a human Supabase deploy

- `supabase secrets set INTERNAL_FUNCTION_SECRET=...`
- Redeploy changed edge functions (listed above)
- Apply `20260811150000_integrity_hardening.sql` (and any pending migrations) if not applied
- Resend SMTP for Auth (if not already live) + confirm `RESEND_API_KEY`
- Production smoke after deploy (CORS, send-email auth, issue-certificate roles)

## Notes / blockers

- `find-a-program.html` is a stub redirect; enroll/dashboard recovery links use
  `organizations.html` / `facilitators.html` / `plan.html` instead.
- `issue-certificate` allows `admin` and `content_reviewer` (enum has no bare
  `reviewer`). Participant self-issue remains award-pipeline only.
- CI e2e step is `continue-on-error` so missing Playwright browsers do not fail CI.
- `tools/check_release.py` rewrites stub HTML files when run; expected.
- Do not commit secrets; `assets/js/config.js` was not modified.
