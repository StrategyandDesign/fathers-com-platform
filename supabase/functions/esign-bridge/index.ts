// ============================================================================
// esign-bridge  ·  Fathers.com  <->  RecordMade e-sign API
// ----------------------------------------------------------------------------
// PURPOSE
//   Server-side bridge so a father can self-sign his awarded certificate.
//   The browser NEVER holds the e-sign API credentials. This function does,
//   as Supabase secrets, and proxies signed, authenticated requests.
//
// OWNERSHIP
//   This file is the integration surface for the e-sign team to review, adjust
//   to the exact API contract, and approve before deploy. Everything the
//   certificate flow needs from e-sign passes through here.
//
// DEPLOY (e-sign team)
//   supabase secrets set ESIGN_BASE_URL="https://<your-esign-host>"
//   supabase secrets set ESIGN_API_TOKEN="<service token>"
//   supabase functions deploy esign-bridge
//
// CONTRACT NOTE
//   Endpoint paths and payload shapes below are inferred from the published
//   OpenAPI (envelopes, sign/self-sign, verify, ledgers). Confirm against the
//   live schema and adjust the marked sections. Nothing here invents crypto;
//   all signing, PAdES/RFC-3161/Ed25519, and the audit ledger stay in your API.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ESIGN_BASE_URL = Deno.env.get("ESIGN_BASE_URL") ?? "";
const ESIGN_API_TOKEN = Deno.env.get("ESIGN_API_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Thin wrapper around the e-sign API. Single place that attaches the token.
async function esign(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ESIGN_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${ESIGN_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  if (!ESIGN_BASE_URL || !ESIGN_API_TOKEN) {
    return json({ error: "e-sign bridge is not configured yet" }, 503);
  }

  // ---- 1) Authenticate the caller (father) via their Supabase JWT ----
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "not signed in" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "invalid session" }, 401);
  const userId = userData.user.id;

  let payload: { action?: string; award_id?: string } = {};
  try { payload = await req.json(); } catch { /* empty */ }

  // ---- 2) Only supported action: self-sign an approved certificate ----
  if (payload.action !== "self_sign_certificate") {
    return json({ error: "unsupported action" }, 400);
  }
  if (!payload.award_id) return json({ error: "award_id required" }, 400);

  // ---- 3) Server-side authorization: the award must be this user's AND approved ----
  const { data: award, error: awardErr } = await admin
    .from("certificate_awards")
    .select("id,user_id,course_id,status,approved_at,envelope_id")
    .eq("id", payload.award_id)
    .single();

  if (awardErr || !award) return json({ error: "award not found" }, 404);
  if (award.user_id !== userId) return json({ error: "not your certificate" }, 403);
  if (award.status !== "approved") return json({ error: "certificate is not approved yet" }, 409);
  if (award.envelope_id) return json({ error: "already signed", envelope_id: award.envelope_id }, 409);

  // Pull enough to describe the document being signed.
  const { data: course } = await admin
    .from("certificate_courses").select("slug,title,hours").eq("id", award.course_id).single();
  const signerName = userData.user.user_metadata?.name || userData.user.email || "Fathers.com member";

  // ========================================================================
  // 4) CALL THE E-SIGN API  —  e-sign team: confirm paths + payloads here.
  //    Inferred from the OpenAPI: SelfSignCreate -> SelfSignResult, then
  //    VerifyBundleResult, then a LedgerEventCreate for the audit trail.
  // ========================================================================

  // 4a) Create + complete a self-sign for the certificate document.
  const selfSign = await esign("/sign/self-sign", {
    method: "POST",
    body: JSON.stringify({
      // SelfSignCreate  (confirm field names against your schema)
      subject: `Fathers.com Certificate — ${course?.title ?? "Certificate"}`,
      signer: { name: signerName, email: userData.user.email, external_id: userId },
      assurance_level: "self_attested",
      signature_method: "typed",
      metadata: { source: "fathers.com", award_id: award.id, course_slug: course?.slug, hours: course?.hours },
    }),
  });
  if (!selfSign.ok) return json({ error: "e-sign self-sign failed", detail: selfSign.data }, 502);

  const result = selfSign.data as Record<string, unknown>;
  const envelopeId = (result?.envelope_id ?? result?.id ?? null) as string | null;

  // 4b) Verify the signed bundle (optional but recommended).
  let verify: unknown = null;
  if (envelopeId) {
    const v = await esign(`/verify/bundle?envelope_id=${encodeURIComponent(envelopeId)}`, { method: "GET" });
    verify = v.data;
  }

  // 4c) Write an audit event to the e-sign ledger (best effort).
  try {
    await esign("/ledgers/events", {
      method: "POST",
      body: JSON.stringify({
        // LedgerEventCreate  (confirm field names)
        event_type: "certificate.self_signed",
        subject_id: award.id,
        actor: userId,
        payload: { envelope_id: envelopeId, course_slug: course?.slug },
      }),
    });
  } catch { /* non-blocking */ }

  // ---- 5) Record the outcome back on the award (service role bypasses RLS) ----
  await admin.from("certificate_awards")
    .update({ envelope_id: envelopeId, signed_at: new Date().toISOString(), status: "signed" })
    .eq("id", award.id);

  return json({ ok: true, envelope_id: envelopeId, verify });
});
