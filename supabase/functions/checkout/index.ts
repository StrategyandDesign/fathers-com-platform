// ============================================================================
// checkout  ·  Fathers.com course enrollment protocol (v4.0.2)
// ----------------------------------------------------------------------------
// The single server-side authority for course enrollment. The browser sends
// intent (the course). This function checks the claim, reads the price from
// the database (participant courses are $0 by policy), and fulfills. The
// client never computes money and never decides eligibility.
//
// v4.0.2: films and training are open without a claim. Enrollment writes
// certificate_enrollments so progress can attach. certificate_awards (the
// issue path) still require an active participant_claims row. No claim is
// not a hard stop: return enrolled + claim_required_for_certificate.
//
// v4.0.1 (one change, two lines): expected outcomes now return HTTP 200.
// supabase-js functions.invoke() discards the response body on any non-2xx
// and hands the client only "Edge Function returned a non-2xx status code".
// Business outcomes are 200 with a discriminated body; only genuine failures
// (auth, not-found, insert error) stay non-2xx.
//
// PAID ROWS (later): the facilitator course may ship as a priced row in
// certificate_courses. The [STRIPE] block below activates for any row with a
// nonzero price once STRIPE_SECRET_KEY is set; fulfillment arrives via
// checkout-webhook, which calls the same fulfill() as the free path.
//
// DEPLOY
//   Dashboard -> Edge Functions -> checkout -> replace source -> Deploy.
//   (No secrets needed for the participant path; SUPABASE_URL / SERVICE_ROLE
//   are injected automatically.)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";   // absent until payments go live

const CORS_BASE = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (origin === "http://localhost:3000") return origin;
  if (/^https:\/\/([a-z0-9-]+\.)?fathers\.com$/.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+-strategyanddesign\.vercel\.app$/.test(origin)) return origin;
  if (/^https:\/\/fathers-com-platform[a-z0-9-]*\.vercel\.app$/.test(origin)) return origin;
  return null;
}
function corsFor(req: Request): Record<string, string> {
  const allowed = allowedOrigin(req.headers.get("Origin"));
  return {
    ...CORS_BASE,
    "Access-Control-Allow-Origin": allowed ?? "https://fathers.com",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}

// Fulfillment is one function so free-now and Stripe-later produce identical
// records: enrollment (active). Certificate award (in_progress) only when claimed.
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

  // Issue path: the accountability record the admin console approves and signs.
  // No claim → no award row. Films still play; a serial cannot mint from this.
  if (args.claimId) {
    await admin.from("certificate_awards")
      .upsert({ user_id: args.userId, course_id: args.courseId, status: "in_progress" },
              { onConflict: "user_id,course_id", ignoreDuplicates: true });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json(req, { error: "not signed in" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json(req, { error: "invalid session" }, 401);
  const userId = userData.user.id;

  let body: { action?: string; course_slug?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.action !== "create_checkout") return json(req, { error: "unsupported action" }, 400);
  if (!body.course_slug) return json(req, { error: "course_slug required" }, 400);

  const { data: course, error: courseErr } = await admin
    .from("certificate_courses")
    .select("id,slug,title,hours,price_cents")
    .eq("slug", body.course_slug.toLowerCase()).single();
  if (courseErr || !course) return json(req, { error: "course not found" }, 404);

  const { data: already } = await admin
    .from("certificate_enrollments")
    .select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle();
  if (already) return json(req, { ok: true, enrolled: true, already: true, course: course.slug });

  const email = (userData.user.email ?? "").toLowerCase();
  const { data: claims } = await admin
    .from("participant_claims")
    .select("id,user_id,participant_email,status")
    .eq("status", "active")
    .or(`user_id.eq.${userId},participant_email.eq.${email}`);
  const claim = (claims ?? [])[0] ?? null;
  if (claim && !claim.user_id) {
    await admin.from("participant_claims").update({ user_id: userId }).eq("id", claim.id);
  }

  const totalCents = course.price_cents;

  if (totalCents <= 0) {
    try {
      await fulfill(admin, {
        userId, courseId: course.id, claimId: claim?.id ?? null,
        amountPaidCents: 0, checkoutRef: null,
      });
      return json(req, {
        ok: true,
        enrolled: true,
        course: course.slug,
        total_cents: 0,
        claim: !!claim,
        ...(claim ? {} : {
          claim_required_for_certificate: true,
          message: "Films and training are open. A certificate needs a facilitator to claim your seat.",
        }),
      });
    } catch (e) {
      return json(req, { error: "enrollment failed", detail: String(e) }, 500);
    }
  }

  if (!STRIPE_SECRET_KEY) {
    return json(req, {
      requires_payment: true,
      total_cents: totalCents,
      message: "This is a priced credential and card payment is not yet enabled.",
    }, 200);
  }
  if (!claim) {
    return json(req, {
      claim_required_for_certificate: true,
      enrolled: false,
      message: "A priced certificate needs a facilitator to claim your seat first.",
    }, 200);
  }
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
  if (!resp.ok) return json(req, { error: "stripe session failed", detail: session }, 502);
  return json(req, { requires_payment: true, checkout_url: session.url, total_cents: totalCents });
});
