# Audit fixes — 2026-08-12

High-leverage UX and security hardening on branch `audit/ux-security-hardening`.
Code changes only in-repo; Supabase secrets and function redeploys are human steps.

## What changed

### Security
- **CORS allowlist** on `_shared/cors.ts` and every edge function that previously
  echoed `Access-Control-Allow-Origin: *`. Origins: `fathers.com` /
  `www.fathers.com`, localhost:3000, Strategy & Design + fathers-com-platform
  Vercel preview hosts. Unknown origins fall back to `https://fathers.com`.
- **`send-email`**: requires Bearer JWT or `x-internal-secret` matching
  `INTERNAL_FUNCTION_SECRET`. Template IDs limited to 01–09 + `org-invite`.
  Arbitrary `html`/`subject` only with the internal secret. Basic `to` email check.
- **`issue-certificate`**: requires Bearer JWT; service-role `getUser`; caller must
  have `admin` or `content_reviewer` in `user_roles`. Requirement checks unchanged.
- **CI**: `.github/workflows/ci.yml` — Python/JS syntax, `tools/check_release.py`,
  optional Playwright e2e (non-blocking if browsers unavailable).

### UX / retention
- Keystone “Save and continue later” / “Save my plan” (and report save / legacy
  demo account screen) use email+password (`FC.signUpPassword` /
  `FC.signInPassword`); magic-link copy removed. `pending_results` /
  `fc_pending_result` / claim-token attach preserved.
- Enroll `claim_required`: recovery CTAs to plan + org/facilitator pages.
- Email prefs: weekly + course default ON for new participants; news opt-in;
  soft opt-out copy on account settings.
- Circles: no first-row auto-join; empty state when facilitator has not opened.
- Dashboard “WHAT IS NEXT”: unclaimed + unenrolled prefers plan.html /
  waiting-on-facilitator, not the certificates enroll wall.

## Deploy checklist (Alon)

1. Set secret: `supabase secrets set INTERNAL_FUNCTION_SECRET=<strong random>`
2. Confirm `RESEND_API_KEY` is set; configure Resend SMTP for Auth emails if not already
   (built-in sender is capped — see ARCHITECTURE.md §6).
3. Redeploy edge functions that changed (at minimum):
   `send-email`, `issue-certificate`, `checkout`, `esign-bridge`,
   `progress_beat`, `checkpoint_submit`, `submit_award`, `review_award`,
   `verify_serial`.
4. Apply integrity migration if not yet applied:
   `supabase/migrations/20260811150000_integrity_hardening.sql`
   (and any earlier pending migrations via `supabase db push`).
5. Smoke: CORS preflight from production + a Vercel preview; send-email reject
   without auth; issue-certificate 401/403 for non-admin; enroll claim_required UI;
   Keystone password save path.


## Launch note (2026-08-12)

Platform launches **film-first** (target **2026-08-16**). Do not ship written-session
primary framing. Before cutover: replace every `vimeo: pending` in `content/*.json`
with live IDs, re-import/seed courses, and smoke the player + progress_beat path
on production networks (see docs/NETWORK-REQUIREMENTS.md).
