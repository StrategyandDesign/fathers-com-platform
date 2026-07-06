# Launch checklist

The build is dual-mode. With empty keys it runs as a demo. With Supabase keys it is live: real accounts, real persistence. Your setup time to live sign-ups: 60 to 90 minutes.

## Go live
1. Push to GitHub, import the repo into Vercel (framework preset: Other). Netlify or GitHub Pages also work. There is no build step.
2. Create a Supabase project. SQL editor: paste and run `supabase/schema.sql`. This creates every table, RLS, the public verification view, the signup trigger, and seeds the nine classes, four certificate courses, and two demo serials.
3. Supabase > Authentication > URL Configuration: set Site URL to your deployed domain and add it to Redirect URLs. Email provider stays on (magic link is the default).
4. Paste the project URL and anon key into `assets/js/config.js`. Redeploy.
5. Test the loop: open /profile.html, finish the Profile, enter your email, click the emailed link. You land on My Plan with your saved baseline, a live Week 1, and working checkboxes.

## Optional, same day
6. Stripe: create a Payment Link for the $120 annual product and paste its URL into `config.js`. The checkout button then goes straight to Stripe. Add a webhook endpoint `https://PROJECT.functions.supabase.co/stripe-webhook` for `checkout.session.completed`, set secrets (`STRIPE_WEBHOOK_SECRET`, `SB_SERVICE_ROLE_KEY`), and deploy `supabase functions deploy stripe-webhook --no-verify-jwt`.
7. Resend: verify your domain, `supabase secrets set RESEND_API_KEY=...`, `supabase functions deploy send-email`. Templates are in `emails/`.
8. Video: paste lesson URLs into `lessons.video_url` in the Supabase table editor. YouTube embed URLs, Vimeo embed URLs, and direct mp4 all play. Progress saves automatically.
9. Photos: drop photography into the slot IDs as it arrives. The registry is Appendix A of the prompt series.

## Keystone Father Profile (the full validated instrument)
The platform ships with the complete 128-item, 26-scale Keystone Father Profile from Dr. Canfield's Technical Bulletin, scored against the published norms (means and SDs from 9,232 respondents). It supports two completion modes (all at once, or section by section with save-and-resume).

To activate it, run the third schema file in the Supabase SQL editor, after the first two:
1. supabase/schema.sql
2. supabase/schema_rbac.sql
3. supabase/schema_keystone.sql  (adds keystone_sessions, keystone_answers, keystone_results)

Once loaded, /profile.html runs the full assessment. A father chooses his mode, answers are saved as he goes, and he can leave and resume on any device. The results screen reports all 26 scales scored against the norm, with his strength and growth-focus flagged.

Note: the instrument data lives in assets/js/keystone-data.js. To edit items or norms later, an instructor can also build/adjust instruments in Studio, but the validated Keystone is loaded directly from the bulletin for fidelity.

## Roles and dashboards setup
1. Run `supabase/schema.sql` first, then `supabase/schema_rbac.sql`. The second adds roles, the authoring tables, the instrument builder, org and Circle authoring, the audit log, and a draft starter Keystone instrument.
2. Sign in once, then in the SQL editor make yourself admin (see ROLES.md).
3. Open admin.html. Grant `instructor` to whoever builds courses. Create your organizations, then grant `org_admin` and `circle_leader` scoped to each org.
4. In studio.html, open the draft Keystone instrument, set the validated weights and cut scores from your valuation document, and publish. The member Keystone page will then run your instrument with your scoring, not the demo.
5. In studio.html, build courses: title, lessons, Vimeo IDs, workbook links, drip. Publish when ready. Members see only published courses.

Video: paste the numeric Vimeo ID (from the video URL) into each lesson. The player embeds Vimeo directly.

## What works on day one, live
Sign-up by emailed link. Keystone Profile saved to the account: assessment, answers, four domain scores, overall baseline. A twelve-week plan auto-created on first sign-in. My Plan pulls the real current week, actions check off to the database, and the chain counts from actual completions. Lesson playback with saved progress wherever a video URL exists. Public certificate verification against the database. Every form on the site writes to tables: story submissions, groups, employers, veterans, newsletter, try-a-class. Stripe checkout if the Payment Link is set.

## Not in v1. Do not promise these tomorrow.
- A filmed class library. The platform functions without it. Lessons play the moment you supply URLs.
- ID-verified certificate issuance. Verification is live. Issuance needs an ID vendor (Stripe Identity or Persona) and the checkpoint pipeline. Until then, issue manually by inserting a certificates row.
- Gift redemption automation, live Circle threads, scheduled weekly emails, native apps.
- Valid Keystone scoring. The demo algorithm runs the mechanics. Replace it before any claim of validity.

## Recommended posture
Launch free founding sign-ups tomorrow. Profile is the front door. Collect leads everywhere. Turn on the Payment Link when you decide to charge.
