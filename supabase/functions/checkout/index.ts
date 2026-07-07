// ============================================================================
// checkout  ·  Fathers.com certificate checkout protocol
// ----------------------------------------------------------------------------
// The single server-side authority for certificate purchase and enrollment.
// The browser sends intent (course + optional coupon). This function decides
// the price from the database, validates the coupon, and fulfills. The client
// never computes money.
//
// TODAY (live path)
//   Valid 100%-off coupon (e.g. father26)  ->  total $0  ->  enroll + award.
//   No coupon / partial coupon             ->  respond requires_payment
//                                              (payments not yet enabled).
//
// STRIPE (drop-in, pre-shaped)
//   The block marked [STRIPE] below is where the paid path activates:
//     supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
//     supabase secrets set CHECKOUT_SUCCESS_URL="https://<host>/enroll.html?paid=1"
//     supabase secrets set CHECKOUT_CANCEL_URL="https://<host>/enroll.html"
//   Fulfillment for paid sessions arrives via the checkout-webhook function,
//   which calls the same fulfill() used by the free path, so free and paid
//   enrollments are identical records.
//
// DEPLOY
//   supabase functions deploy checkout
//   (No secrets needed for the free path; SUPABASE_URL / SERVICE_ROLE are
//   injected automatically.)
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
  userId: string; courseId: string; coupon: string | null;
  amountPaidCents: number; checkoutRef: string | null;
}) {
  const { data: existing } = await admin
    .from("certificate_enrollments")
    .select("id").eq("user_id", args.userId).eq("course_id", args.courseId).maybeSingle();

  if (!existing) {
    const ins = await admin.from("certificate_enrollments").insert({
      user_id: args.userId, course_id: args.courseId, status: "active",
      coupon: args.coupon, amount_paid_cents: args.amountPaidCents,
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

  let body: { action?: string; course_slug?: string; coupon?: string } = {};
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

  // ---- 3) Coupon validation, server-side only ----
  let percentOff = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  if (body.coupon && body.coupon.trim()) {
    const code = body.coupon.trim().toLowerCase();
    const { data: c } = await admin
      .from("coupons")
      .select("id,code,percent_off,active,expires_at,max_redemptions")
      .eq("code", code).maybeSingle();
    const expired = c?.expires_at ? new Date(c.expires_at) < new Date() : false;
    let exhausted = false;
    if (c && c.max_redemptions != null) {
      const { count } = await admin
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true }).eq("coupon_id", c.id);
      exhausted = (count ?? 0) >= c.max_redemptions;
    }
    if (!c || !c.active || expired || exhausted) {
      return json({ error: "invalid_coupon", message: "That code was not recognized." }, 400);
    }
    percentOff = c.percent_off; couponId = c.id; couponCode = c.code;
  }

  const totalCents = Math.round(course.price_cents * (100 - percentOff) / 100);

  // ---- 4) Free path: fulfill now ----
  if (totalCents <= 0) {
    try {
      await fulfill(admin, {
        userId, courseId: course.id, coupon: couponCode,
        amountPaidCents: 0, checkoutRef: null,
      });
      if (couponId) {
        await admin.from("coupon_redemptions")
          .upsert({ coupon_id: couponId, user_id: userId, course_id: course.id },
                  { onConflict: "coupon_id,user_id,course_id", ignoreDuplicates: true });
      }
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
      message: "Card payment activates soon. Enter your program code for free access now.",
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
    "metadata[coupon]": couponCode ?? "",
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
