// Fathers.com : Stripe webhook -> subscriptions
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... SB_SERVICE_ROLE_KEY=...
// Stripe:  add endpoint https://PROJECT.functions.supabase.co/stripe-webhook
//          for the event checkout.session.completed

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verify(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=") as [string, string]));
  const t = parts["t"], v1 = parts["v1"];
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === v1 && Math.abs(Date.now() / 1000 - Number(t)) < 300;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.text();
    const ok = await verify(payload, req.headers.get("stripe-signature") ?? "",
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "");
    if (!ok) return new Response("bad signature", { status: 400 });

    const event = JSON.parse(payload);
    if (event.type !== "checkout.session.completed") return new Response("ignored", { status: 200 });

    const s = event.data.object;
    const email = s.customer_details?.email ?? s.customer_email;
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SB_SERVICE_ROLE_KEY")!);

    const { data: profile } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();
    const periodEnd = new Date(Date.now() + 365 * 86400000).toISOString();

    if (profile) {
      await sb.from("subscriptions").insert({
        user_id: profile.id, status: "active",
        price_cents: s.amount_total ?? 12000,
        current_period_end: periodEnd,
        stripe_customer_id: s.customer, stripe_subscription_id: s.subscription
      });
    } else {
      // Paid before creating an account. Park it; claim on first sign-in is a v1.2 task.
      await sb.from("leads").insert({ source: "stripe-paid-no-account", email,
        payload: { customer: s.customer, subscription: s.subscription, amount: s.amount_total } });
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
