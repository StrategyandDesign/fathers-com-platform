// ============================================================================
// checkout  ·  Fathers.com course enrollment protocol (v4.0)
// ----------------------------------------------------------------------------
// The single server-side authority for course enrollment. The browser sends
// intent (the course). This function checks the claim, reads the price from
// the database (participant courses are $0 by policy), and fulfills. The
// client never computes money and never decides eligibility.
//
// v4.0 RULE (POSITIONING.md 3): a participant can only enroll when an active
// claim exists for him, placed by a Certified Facilitator or a Certified
// Organization. Claims live in participant_claims and match on user_id or on
// the sign-in email. No claim -> claim_required, no enrollment.
//
// PAID ROWS (later): the facilitator course may ship as a priced row in
// certificate_courses. The [STRIPE] block below activates for any row with a
// nonzero price once STRIPE_SECRET_KEY is set; fulfillment arrives via
// checkout-webhook, which calls the same fulfill() as the free path.
//
// DEPLOY
//   supabase functions deploy checkout
//   (No secrets needed for the participant path; SUPABASE_URL / SERVICE_ROLE
//   are injected automatically.)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";   // absent until payments go live

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Fulfillment is one function so free-now and Stripe-later produce identical
// records: enrollment (active) + certificate award (in_progress).
async function fulfill(admin: ReturnType<typeof createClient>, args: {
  userId: string; courseId: string; claimId: string | null;
  amountPaidCents: number; checkoutRef: string | null;
}) {
  const { data: existing } = await admin
    .from("certificate_enrollments")
    .select("id").eq("user_id", args.userId).eq("course_id", args.courseId).maybeSingle();

  if (!existing) {
    const ins = await admin.from("certificate_enrollments").insert({
      user_id: args.userId, course_id: args.courseId, status: "active",
      claim_id: args.claimId, amount_paid_cents: args.amountPaidCents,
      checkout_ref: args.checkoutRef,
    });
    if (ins.error) throw ins.error;
  }

  // The accountability record the admin console approves and e-sign signs.
  await admin.from("certificate_awards")
    .upsert({ user_id: args.userId, course_id: args.courseId, status: "in_progress" },
            { onConflict: "user_id,course_id", ignoreDuplicates: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // ---- 1) Authenticate the father ----
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "not signed in" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "invalid session" }, 401);
  const userId = userData.user.id;

  let body: { action?: string; course_slug?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.action !== "create_checkout") return json({ error: "unsupported action" }, 400);
  if (!body.course_slug) return json({ error: "course_slug required" }, 400);

  // ---- 2) Price truth: the database, never the browser ----
  const { data: course, error: courseErr } = await admin
    .from("certificate_courses")
    .select("id,slug,title,hours,price_cents")
    .eq("slug", body.course_slug.toLowerCase()).single();
  if (courseErr || !course) return json({ error: "course not found" }, 404);

  // Already enrolled: succeed idempotently.
  const { data: already } = await admin
    .from("certificate_enrollments")
    .select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle();
  if (already) return json({ ok: true, enrolled: true, already: true, course: course.slug });

  // ---- 3) The claim check: the sole enrollment path ----
  const email = (userData.user.email ?? "").toLowerCase();
  const { data: claims } = await admin
    .from("participant_claims")
    .select("id,user_id,participant_email,status")
    .eq("status", "active")
    .or(`user_id.eq.${userId},participant_email.eq.${email}`);
  const claim = (claims ?? [])[0] ?? null;
  if (!claim) {
    return json({
      claim_required: true,
      message: "No active claim found. Ask your facilitator or organization to claim your seat, then enroll again.",
    }, 403);
  }
  // Attach the account to an email-only claim so future checks are direct.
  if (!claim.user_id) {
    await admin.from("participant_claims").update({ user_id: userId }).eq("id", claim.id);
  }

  const totalCents = course.price_cents;

  // ---- 4) Participant path ($0 by policy): fulfill now ----
  if (totalCents <= 0) {
    try {
      await fulfill(admin, {
        userId, courseId: course.id, claimId: claim.id,
        amountPaidCents: 0, checkoutRef: null,
      });
      return json({ ok: true, enrolled: true, course: course.slug, total_cents: 0 });
    } catch (e) {
      return json({ error: "enrollment failed", detail: String(e) }, 500);
    }
  }

  // ---- 5) [STRIPE] Paid path: pre-shaped, activates when the secret exists ----
  if (!STRIPE_SECRET_KEY) {
    return json({
      requires_payment: true,
      total_cents: totalCents,
      message: "This is a priced credential and card payment is not yet enabled.",
    }, 402);
  }
  // When STRIPE_SECRET_KEY is set, create a Checkout Session and return its URL.
  // Fulfillment happens in checkout-webhook on checkout.session.completed.
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(totalCents),
    "line_items[0][price_data][product_data][name]": `Fathers.com Certificate: ${course.title}`,
    "line_items[0][quantity]": "1",
    success_url: Deno.env.get("CHECKOUT_SUCCESS_URL") ?? "https://fathers-com-platform.vercel.app/enroll.html?paid=1",
    cancel_url: Deno.env.get("CHECKOUT_CANCEL_URL") ?? "https://fathers-com-platform.vercel.app/enroll.html",
    client_reference_id: userId,
    "metadata[user_id]": userId,
    "metadata[course_id]": course.id,
    "metadata[course_slug]": course.slug,
    "metadata[claim_id]": claim.id,
  });
  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = await resp.json();
  if (!resp.ok) return json({ error: "stripe session failed", detail: session }, 502);
  return json({ requires_payment: true, checkout_url: session.url, total_cents: totalCents });
});
