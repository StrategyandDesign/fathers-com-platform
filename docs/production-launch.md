# Production launch checklist

Use this to stand up a **new** production stack. Do not point production Vercel at the Pilot Supabase project (`koeplcybddrvbliuepsy`) and do not copy the pilot service-role key into any `NEXT_PUBLIC_*` variable.

Current live pilot (leave it running until smoke tests pass on production):

- App: https://fathers-com-pilot.vercel.app
- Supabase: `koeplcybddrvbliuepsy`

## 1. Supabase production project

1. Create a new Supabase project (new ref, new keys, empty database). Do not restore a pilot dump unless you intend to bring pilot users with you.
2. Link the CLI to the **new** project only: `supabase link --project-ref <prod-ref>`.
3. Apply **only** the clean-pilot production migrations, in this order. Do **not** run `supabase db push` against the full `supabase/migrations/` folder — that folder still contains historical Keystone files and a draft.

   Apply these files (SQL editor or `supabase db query` / one-at-a-time):

   1. `supabase/migrations/20260817025510_pilot_core_schema.sql`
   2. `supabase/migrations/20260817033531_pilot_rls_policies.sql`
   3. `supabase/migrations/20260817035107_join_group_with_invite_code.sql`
   4. `supabase/migrations/20260817035704_seed_pilot_trainings.sql`
   5. `supabase/migrations/20260817040606_father_profile_drafts.sql`
   6. `supabase/migrations/20260817041330_reviewer_insights.sql`
   7. `supabase/migrations/20260817052904_update_fundamentals_videos.sql`
   8. `supabase/migrations/20260817053434_certs_prefs_avatars.sql`
   9. `supabase/migrations/20260817055625_notify_recipient_and_write_rls.sql`

4. **Do not apply** `supabase/migrations/20260817053757_remaining_features_storage.sql`. It is a draft. Storage buckets and policies already come from `certs_prefs_avatars`.
5. **Do not apply** any `202607*` or other pre-`20260817` files in `supabase/migrations/`. Those belong to the previous platform.
6. Auth → URL configuration:
   - Site URL = the production origin (`https://your-domain`)
   - Redirect URLs: production origin, `https://your-domain/**`, and `http://localhost:3000/**` if you still develop locally against prod (prefer a separate staging project).
7. Auth → Email: turn on leaked-password protection. Configure custom SMTP with Resend (host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key) so confirm/reset mail is not capped at 2/hour.
8. Auth → Providers: email/password only for this launch.
9. Create the first manager/reviewer in the dashboard:
   - `public.profiles.role` = `manager` or `reviewer`
   - `auth.users.raw_app_meta_data.role` = the same value (the app authorizes from `app_metadata`, never `user_metadata`)
10. Confirm Storage after the certs migration:
    - Buckets `certificates` and `avatars` exist and are **private**
    - MIME/size limits: PDF ≤ 5 MB; avatars JPEG/PNG/WebP/GIF ≤ 2 MB
    - Object policies from `certs_prefs_avatars` (signed URLs + RLS; no public bucket)

## 2. Vercel production project + domain

1. Create a **new** Vercel project from this repo / `clean-pilot` (do not reuse the pilot project’s Production env if it still points at `koeplcybddrvbliuepsy`).
2. Framework preset: Next.js. Build command: `next build --turbopack` (or the repo `build` script).
3. Add the custom domain. Point DNS (A/CNAME as Vercel instructs). Wait for the TLS certificate.
4. Set Production environment variables from the table below. Preview/dev can keep the pilot project if you want; Production must use the new Supabase project.
5. Deploy Production. Confirm the deployment origin matches Auth Site URL.

## 3. Environment variables

| Name | Where | Required | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Yes | Production project URL only |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + server | Yes (or anon) | Publishable/anon key. **Not** the service role |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Fallback | Used if publishable key is unset |
| `NEXT_PUBLIC_SITE_URL` | Client + server | Yes | Production origin, no trailing slash |
| `APP_URL` | Server | Recommended | Wins for email links; same origin as the site |
| `NEXT_PUBLIC_APP_URL` | Client + server | Optional | Alias of the public origin |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | No | Unused by this Next app. Do not set unless a future server job needs it. Never `NEXT_PUBLIC_*` |
| `EMAIL_PROVIDER` | Server | No | `resend` (default when the API key is set). Missing key = no-op |
| `RESEND_API_KEY` | Server | For app email | Transactional mail. Pilot/local work without it |
| `EMAIL_FROM` | Server | For app email | Must be on a Resend-verified domain |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | For browser errors | DSN is designed to be public |
| `SENTRY_DSN` | Server | Optional | Server/edge override; same DSN is fine |
| `SENTRY_AUTH_TOKEN` | CI / Vercel | Optional | Source maps only |
| `SENTRY_ORG` | CI / Vercel | Optional | Source maps only |
| `SENTRY_PROJECT` | CI / Vercel | Optional | Source maps only |

See `.env.example` for placeholders. Do not commit `.env.local`.

## 4. Storage buckets

Created by `20260817053434_certs_prefs_avatars.sql`:

| Bucket | Public | Path convention | Who can write | Who can read |
| --- | --- | --- | --- | --- |
| `certificates` | No | `{father_id}/{serial}.pdf` | Manager who manages that father | That father + that manager (signed URL or download route) |
| `avatars` | No | `{user_id}/avatar` | The owner | Owner + managing manager (signed URL) |

The app never uses public object URLs. Certificate download is `/api/certificates/[id]/download` (auth + RLS). Avatars use `createSignedUrl`.

## 5. Email (Resend)

1. Create a Resend account. Add and verify the sending domain (SPF, DKIM, return-path).
2. Set `RESEND_API_KEY` and `EMAIL_FROM` on Vercel Production. Set `APP_URL` to the production origin.
3. Optional: `EMAIL_PROVIDER=resend`. If the API key is missing, sends are skipped and the business action still succeeds.
4. Point Supabase Auth SMTP at the same Resend domain for confirm/reset mail (section 1.7).
5. Wired app events (respect notification toggles; other keys are an extension point only):
   - Father `new_trainings` — manager assigns a training
   - Father + manager `certificate_sent` — manager issues a certificate
   - `account_security_alerts` — welcome after signup
6. Confirm/reset mail is Supabase Auth, not the app sender.

## 6. DNS / domain

1. Decide the production hostname (see `docs/DOMAIN.md` if the canonical host is still pending).
2. Add the domain in Vercel. Create the DNS records Vercel shows.
3. Set `NEXT_PUBLIC_SITE_URL` / `APP_URL` to `https://that-host` (no trailing slash).
4. Put the same origin in Supabase Auth Site URL + Redirect URLs.
5. Do not print partner-kit QR codes until this origin is stable.

## 7. Sentry

1. Create a Sentry project (Next.js).
2. Set `NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_DSN`) on Vercel.
3. Optional source maps: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
4. With no DSN, Sentry is disabled. Local and pilot keep working.
5. Trigger a test error on Production and confirm it appears in Sentry before calling the launch done.

## 8. Rate limiting

In-memory sliding windows, keyed by IP + route, fail open:

- `auth.signin` — 10 / 15 min
- `auth.signup` — 5 / 60 min
- `certificates.download` — 30 / 5 min
- `account.avatar` — 8 / 15 min

This is per Vercel isolate, not global. Production can later swap the store for Redis / Upstash without changing the call sites in `lib/security/rate-limit.ts`.

## 9. Final smoke test

Use a throwaway manager and father on the **production** project (not the pilot).

- [ ] Manager signs in and lands on `/manager`
- [ ] Father signs up with the invite code, receives welcome mail (if Resend is set), signs in
- [ ] Father opens a session film (YouTube embed plays), completes check-in and action
- [ ] Manager assigns a training; father toggle `new_trainings` on → email arrives; toggle off → no email
- [ ] Manager issues a certificate; PDF stores in the private `certificates` bucket
- [ ] Father and manager can download the PDF; a user from another org cannot
- [ ] Avatar upload on Account; photo shows after refresh; another org cannot see it
- [ ] Notification preferences save and stick
- [ ] Certificate-issued emails honor `certificate_sent` for father and manager
- [ ] RLS sanity: father A cannot read father B’s progress, certificates, or avatar
- [ ] Service role is absent from the browser bundle and from every `NEXT_PUBLIC_*` value
- [ ] Sentry received a test error
- [ ] Confirm/reset mail still works through Supabase SMTP

## 10. Switching off the pilot

When production smoke tests pass:

1. Leave https://fathers-com-pilot.vercel.app up for a short overlap, then pause or unpublish it.
2. Do **not** copy into production:
   - Pilot `SUPABASE_SERVICE_ROLE_KEY` or any key from `koeplcybddrvbliuepsy`
   - Pilot `NEXT_PUBLIC_SUPABASE_*` values
   - Vercel OIDC / pull-through tokens from `.env.local`
   - Pilot user passwords or a full Auth dump unless you have an explicit migration plan
3. Do **not** apply the draft `remaining_features_storage` migration to production or to the pilot.
4. Manager/reviewer roles must be set again on the new project (`profiles.role` + `app_metadata.role`).
5. After cutover, rotate the pilot service-role key if it was ever shared beyond the team.

## What still needs a human

The repo is wired. These are dashboard/DNS steps this change cannot do:

- Create and link the production Supabase project
- Apply the nine production migrations (skip the draft and the historical files)
- Create the Vercel production project and attach the custom domain
- Verify the Resend domain and paste `RESEND_API_KEY` / `EMAIL_FROM`
- Create the Sentry project and paste the DSN
- Stamp the first manager/reviewer `app_metadata.role`
- Enable leaked-password protection and Auth SMTP in the Supabase dashboard
