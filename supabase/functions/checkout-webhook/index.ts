// ============================================================================
// checkout-webhook  ·  Stripe fulfillment endpoint (scaffold, not yet live)
// ----------------------------------------------------------------------------
// Activates with Stripe. Receives checkout.session.completed and fulfills the
// enrollment with the same record shape the free path writes.
//
// ACTIVATION (when payments go live)
//   1. In Stripe: add an endpoint for this function's URL, event
//      checkout.session.completed, and copy the signing secret.
//   2. supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
//   3. supabase functions deploy checkout-webhook --no-verify-jwt
//      (Stripe calls it, not a signed-in user.)
//
// SECURITY: the signature check below is mandatory. Without it, anyone could
// POST a fake "paid" event. Do not remove it to make testing easier.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  // Stripe signature: t=timestamp,v1=hmacSHA256(`${t}.${payload}`, secret)
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=") as [string, string]));
  const t = parts["t"]; const v1 = parts["v1"];
  if (!t || !v1) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!WEBHOOK_SECRET) return new Response("webhook not configured", { status: 503 });

  const payload = await req.text();
  const ok = await verifyStripeSignature(payload, req.headers.get("stripe-signature"), WEBHOOK_SECRET);
  if (!ok) return new Response("invalid signature", { status: 400 });

  const event = JSON.parse(payload);
  if (event.type !== "checkout.session.completed") return new Response("ignored", { status: 200 });

  const s = event.data.object;
  const userId = s.metadata?.user_id;
  const courseId = s.metadata?.course_id;
  if (!userId || !courseId) return new Response("missing metadata", { status: 400 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: existing } = await admin
    .from("certificate_enrollments")
    .select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (!existing) {
    const ins = await admin.from("certificate_enrollments").insert({
      user_id: userId, course_id: courseId, status: "active",
      claim_id: s.metadata?.claim_id || null,
      amount_paid_cents: s.amount_total ?? 0,
      checkout_ref: s.id,
    });
    if (ins.error) return new Response("fulfillment failed", { status: 500 });
  }
  await admin.from("certificate_awards")
    .upsert({ user_id: userId, course_id: courseId, status: "in_progress" },
            { onConflict: "user_id,course_id", ignoreDuplicates: true });

  return new Response("fulfilled", { status: 200 });
});
