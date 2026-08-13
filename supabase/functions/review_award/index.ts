// review_award (WP-F): the approval path. circle_leader / org_admin / admin only, legal
// transitions only, contact hours and attestation frozen at approval, the
// serial minted at signing, every action audited with the reviewer as actor.
// Queue joins awards.user_id to the caller's active participant_claims:
// org_admin by org, circle_leader by circle if those claims exist else org,
// platform admin global. snapshot_checkpoints is video-id keys only.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// CORS helpers inlined so this function deploys as a single pasted file
// from the Supabase dashboard editor, no shared-module resolution required.
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
function preflight(req: Request): Response | null {
  return req.method === "OPTIONS" ? new Response("ok", { headers: corsFor(req) }) : null;
}
function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), "Content-Type": "application/json" } });
}



type RoleRow = { role: string; org_id?: string | null };
type ClaimRow = { user_id?: string | null };

/** Keys only. Never {right, total} or answer bodies. UI counts Object.keys. */
function scrubCheckpoints(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  return Object.keys(raw as Record<string, unknown>);
}

function idsFromClaims(rows: ClaimRow[] | null | undefined): string[] {
  return [...new Set((rows ?? []).map((c) => c.user_id).filter((id): id is string => !!id))];
}

async function reviewerScope(
  svc: ReturnType<typeof createClient>,
  reviewer: string,
): Promise<{ allowed: boolean; isAdmin: boolean; userIds: string[] | null }> {
  const { data: roles } = await svc.from("user_roles").select("role,org_id").eq("user_id", reviewer);
  const rows = (roles ?? []) as RoleRow[];
  const isAdmin = rows.some((r) => r.role === "admin");
  const isOrg = rows.some((r) => r.role === "org_admin");
  const isLeader = rows.some((r) => r.role === "circle_leader");
  if (!isAdmin && !isOrg && !isLeader) return { allowed: false, isAdmin: false, userIds: [] };
  if (isAdmin) return { allowed: true, isAdmin: true, userIds: null };

  const orgIds = [...new Set(rows.filter((r) => r.org_id && (r.role === "org_admin" || r.role === "circle_leader")).map((r) => r.org_id as string))];

  // Join awards.user_id to the caller's active participant_claims (queried, not a global dump).
  if (isOrg && orgIds.length) {
    const { data: claims } = await svc.from("participant_claims")
      .select("user_id")
      .eq("status", "active")
      .in("org_id", orgIds);
    return { allowed: true, isAdmin: false, userIds: idsFromClaims(claims as ClaimRow[]) };
  }

  if (isLeader) {
    const { data: memberships } = await svc.from("circle_members")
      .select("circle_id")
      .eq("user_id", reviewer)
      .eq("role", "leader");
    const circleIds = [...new Set((memberships ?? []).map((m: { circle_id?: string }) => m.circle_id).filter((id): id is string => !!id))];
    if (circleIds.length) {
      const { data: circleClaims } = await svc.from("participant_claims")
        .select("user_id")
        .eq("status", "active")
        .in("circle_id", circleIds);
      const circleIdsFound = idsFromClaims(circleClaims as ClaimRow[]);
      if (circleIdsFound.length) return { allowed: true, isAdmin: false, userIds: circleIdsFound };
    }
    if (orgIds.length) {
      const { data: orgClaims } = await svc.from("participant_claims")
        .select("user_id")
        .eq("status", "active")
        .in("org_id", orgIds);
      return { allowed: true, isAdmin: false, userIds: idsFromClaims(orgClaims as ClaimRow[]) };
    }
    const { data: own } = await svc.from("participant_claims")
      .select("user_id")
      .eq("status", "active")
      .eq("facilitator_user_id", reviewer);
    return { allowed: true, isAdmin: false, userIds: idsFromClaims(own as ClaimRow[]) };
  }

  return { allowed: true, isAdmin: false, userIds: [] };
}

function inScope(scope: { isAdmin: boolean; userIds: string[] | null }, userId: string): boolean {
  if (scope.isAdmin) return true;
  return !!(scope.userIds && scope.userIds.includes(userId));
}

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  const auth = req.headers.get("Authorization") ?? "";
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: userData } = await anon.auth.getUser();
  const reviewer = userData?.user?.id;
  if (!reviewer) return json(req, { error: "not signed in" }, 401);

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const scope = await reviewerScope(svc, reviewer);
  if (!scope.allowed) return json(req, { error: "reviewer role required" }, 403);

  let body: { user_id?: string; course_id?: string; action?: string; note?: string; contact_hours?: number; attestation_method?: string; integrity_cleared?: boolean };
  try { body = await req.json(); } catch { return json(req, { error: "malformed body" }, 400); }
  const { user_id, course_id, action, note, contact_hours, attestation_method } = body;
  const recipient_display = typeof (body as { recipient_display?: string }).recipient_display === "string" ? (body as { recipient_display?: string }).recipient_display!.trim() : undefined;

  // Reviewer read path: the queue of submitted awards with evidence, plus the
  // 72-hour absence list. Reads run with the service role because RLS scopes
  // participants to their own rows; the role gate above is the authority here.
  if (action === "queue") {
    const scopedIds = scope.userIds;
    if (!scope.isAdmin && (!scopedIds || scopedIds.length === 0)) {
      return json(req, { data: { submitted: [], flags: [], absent: [] } });
    }
    let awardsQ = svc.from("certificate_awards").select("user_id,course_id,status,record_integrity,recipient_display,snapshot_independent_seconds,snapshot_checkpoints,snapshot_final_answers_count,snapshot_at").eq("status", "submitted");
    let flagsQ = svc.from("integrity_flags").select("user_id,course_id,reason");
    let enrsQ = svc.from("certificate_enrollments").select("user_id,course_id,state,last_activity_at").in("state", ["enrolled", "in_progress"]);
    if (scopedIds) {
      awardsQ = awardsQ.in("user_id", scopedIds);
      flagsQ = flagsQ.in("user_id", scopedIds);
      enrsQ = enrsQ.in("user_id", scopedIds);
    }
    const { data: subs } = await awardsQ;
    const { data: flags } = await flagsQ;
    const cutoff = new Date(Date.now() - 72 * 3600_000).toISOString();
    const { data: enrs } = await enrsQ;
    const absent = (enrs ?? []).filter((e: { last_activity_at?: string }) => !e.last_activity_at || e.last_activity_at < cutoff);
    const submitted = (subs ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      snapshot_checkpoints: scrubCheckpoints(s.snapshot_checkpoints),
    }));
    return json(req, { data: { submitted, flags: flags ?? [], absent } });
  }
  if (!user_id || !course_id || !action) return json(req, { error: "bad request" }, 400);
  if (!inScope(scope, user_id)) return json(req, { error: "not your roster" }, 403);

  const { data: cur } = await svc.from("certificate_awards").select("*").eq("user_id", user_id).eq("course_id", course_id).maybeSingle();
  if (!cur) return json(req, { error: "no award" }, 404);

  const legal: Record<string, string[]> = { approve: ["submitted"], return: ["submitted"], sign: ["approved"] };
  if (!legal[action]?.includes(cur.status)) return json(req, { error: `cannot ${action} from ${cur.status}` }, 409);

  if (cur.record_integrity === "flagged" && action === "approve" && !body.integrity_cleared) {
    return json(req, { error: "record is flagged; review and set integrity_cleared with a note" }, 409);
  }

  if (action === "approve") {
    if (typeof contact_hours !== "number" || !["facilitator", "id"].includes(attestation_method ?? "")) {
      return json(req, { error: "approve requires contact_hours and attestation_method" }, 400);
    }
    const nameAtApprove = recipient_display || (cur.recipient_display ?? "").trim();
    if (!nameAtApprove) return json(req, { error: "approve requires the recipient's name; the facilitator confirms it" }, 400);
    await svc.from("certificate_awards").update({
      status: "approved", contact_hours, attestation_method,
      recipient_display: nameAtApprove,
      review_note: note ?? null,
      integrity_cleared: body.integrity_cleared ? true : cur.integrity_cleared ?? null,
    }).eq("user_id", user_id).eq("course_id", course_id);
  } else if (action === "return") {
    await svc.from("certificate_awards").update({ status: "returned", review_note: note ?? null }).eq("user_id", user_id).eq("course_id", course_id);
  } else if (action === "sign") {
    if (!(cur.recipient_display ?? "").trim()) return json(req, { error: "cannot sign without a confirmed recipient name" }, 409);
    let serial = "";
    for (let i = 0; i < 8; i++) {
      const AB = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford, no confusables
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      serial = "FC-2026-" + Array.from(bytes).map((b) => AB[b % 32]).join("");
      const { data: clash } = await svc.from("public_certificates").select("serial").eq("serial", serial).maybeSingle();
      if (!clash) break;
    }
    const issued_at = new Date().toISOString();
    await svc.from("certificate_awards").update({ status: "signed", serial, issued_at }).eq("user_id", user_id).eq("course_id", course_id);
    const { data: course } = await svc.from("certificate_courses").select("title").eq("id", course_id).maybeSingle();
    await svc.from("public_certificates").upsert({
      serial, status: "issued", issued_at,
      course_title: course?.title ?? "",
      recipient_display: cur.recipient_display ?? "",
      contact_hours: cur.contact_hours ?? 0,
      attestation_method: cur.attestation_method ?? "facilitator",
      snapshot_independent_seconds: cur.snapshot_independent_seconds ?? 0,
    }, { onConflict: "serial" });
  } else {
    return json(req, { error: "unknown action" }, 400);
  }
  await svc.from("award_audit").insert({ user_id, course_id, actor: reviewer, from_status: cur.status, to_status: action === "approve" ? "approved" : action === "return" ? "returned" : "signed", ip: req.headers.get("x-forwarded-for") ?? null });
  return json(req, { data: { ok: true } });
});
