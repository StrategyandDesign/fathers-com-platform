# Checkout protocol

The single server-side authority for certificate purchase. The browser sends
intent only (course slug + optional coupon). This function owns price, coupon
validation, and fulfillment. ARCHITECTURE.md ADR-3 governs this design.

## Live today (free path)
- Coupons live in the `coupons` table (server-only, RLS closed to clients).
- `father26` and `fatherclan` are seeded at 100% off.
- Valid 100% coupon -> enrollment + certificate award created server-side.
- No/invalid coupon -> 402 requires_payment ("card payment activates soon").
- The old client-side "self enroll" RLS policy is dropped: the function is the
  only door.

## Deploy now
```
supabase functions deploy checkout
```
Run checkout_coupons.sql first (SQL editor now; as a migration once baselined).

## Activate Stripe later (no rearchitecting)
1. supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
2. supabase secrets set CHECKOUT_SUCCESS_URL / CHECKOUT_CANCEL_URL
3. Stripe dashboard: webhook endpoint -> checkout-webhook URL, event
   checkout.session.completed; copy signing secret.
4. supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
5. supabase functions deploy checkout-webhook --no-verify-jwt
The paid path in checkout/index.ts activates automatically once
STRIPE_SECRET_KEY exists. Free and paid enrollments write identical records.

## Review points
- Price comes from certificate_courses.price_cents. Repricing = a data change.
- Coupon rules: active flag, expiry, max redemptions, one redemption per
  father per course.
- Idempotent: re-checkout of an enrolled course returns already:true.
- Webhook signature verification is mandatory and implemented (HMAC v1).
