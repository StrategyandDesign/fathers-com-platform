# Email setup: the single highest-leverage unshipped item

The platform's nine transactional and cadence templates are already built
(emails/, build_emails.py) and the send-email function is deployed. What is
missing is only the SMTP provider. Until it is configured, Supabase's built-in
sender caps at 2 emails per hour; one cohort intake exceeds that in minutes.
Owner: Alon. Effort: under an hour plus DNS propagation.

## Steps (Resend)
1. Create the Resend account under the NCF workspace. Add the sending domain
   (decide with docs/DOMAIN.md; mail can run on fathers.com even while the app
   domain decision is pending).
2. Add the DNS records Resend issues: SPF, DKIM, and the return-path CNAME.
   Verify in Resend before proceeding.
3. Supabase dashboard: Authentication, Emails, SMTP settings. Enable custom
   SMTP with Resend's host, port 465, username resend, and the API key as the
   password. Set the sender name to Fathers.com and the sender address on the
   verified domain.
4. Send the test email from the same screen. Then run one real password reset
   end to end.
5. Raise the rate limit in Authentication, Rate limits, to cover cohort
   intake: 30 per hour is enough for ten organizations onboarding.

## What switches on the moment this ships
1. Welcome and sign-in emails at cohort intake without the 2-per-hour stall.
2. The weekly plan-step cadence and missed-week nudge, the platform's largest
   retention lever after the facilitator himself.
3. Certificate-issued notifications from the issue-certificate function.

## Test procedure
1. Claim a test participant, complete intake, confirm the welcome arrives.
2. Trigger one nudge from the cadence and confirm rendering on a phone.
3. Issue one test certificate on a dev course and confirm the issued email.
