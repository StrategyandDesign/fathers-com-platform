# Checkout integration (v4.0)

The browser sends intent only (the course slug). This function owns
eligibility, price, and fulfillment. The client computes nothing.

- Participation is claim-gated (POSITIONING.md 3). An active row in
  `participant_claims` matching the signed-in user (by user_id or sign-in
  email) is the only door into a course. No claim -> 403 claim_required.
- Participant courses are $0 by policy; `certificate_courses.price_cents`
  is the price authority and the v4.0 migration zeroes it.
- Fulfillment writes `certificate_enrollments` (with `claim_id`) plus a
  `certificate_awards` row at in_progress, identical for free and paid paths.
- Priced professional rows (the facilitator course, later) flow through the
  [STRIPE] block once STRIPE_SECRET_KEY is set; checkout-webhook fulfills.

Apply `supabase/migrations/20260718090000_keystone_v4_0_reposition.sql`
before deploying this function version.
