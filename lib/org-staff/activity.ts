import { createClient } from "@/lib/supabase/server";
import type { OrganizationActivityRow } from "@/lib/org-staff/types";
import { isOrganizationActivityKind } from "@/lib/org-staff/types";

type StaffClient = Awaited<ReturnType<typeof createClient>>;

function missingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /organization_activity/i.test(error.message ?? "")
  );
}

function asPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function recordOrganizationActivity(
  supabase: StaffClient,
  input: {
    groupId: string;
    actorId: string;
    kind: string;
    payload?: Record<string, unknown>;
  }
) {
  if (!input.groupId || !input.actorId || !input.kind) return;
  const { error } = await supabase.from("organization_activity").insert({
    group_id: input.groupId,
    actor_id: input.actorId,
    kind: input.kind,
    payload: input.payload ?? {},
  });
  if (error && !missingRelation(error)) {
    console.error("[org-staff] activity write failed", error.message);
  }
}

export async function loadOrganizationActivity(
  groupIds: string[],
  limit = 12
): Promise<OrganizationActivityRow[]> {
  const ids = [...new Set(groupIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_activity")
    .select("id, group_id, actor_id, kind, payload, created_at")
    .in("group_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (missingRelation(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    group_id: string;
    actor_id: string;
    kind: string;
    payload: unknown;
    created_at: string;
  }>;
  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((row) => row.actor_id))];
  const [{ data: groups }, { data: profiles }] = await Promise.all([
    supabase.from("groups").select("id, name").in("id", ids),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds.length ? actorIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const groupName = new Map(
    ((groups ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name])
  );
  const actorName = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((row) => [
      row.id,
      row.full_name?.trim() || "A leader",
    ])
  );

  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: groupName.get(row.group_id) ?? "Group",
    actorId: row.actor_id,
    actorName: actorName.get(row.actor_id) ?? "A leader",
    kind: isOrganizationActivityKind(row.kind) ? row.kind : row.kind,
    payload: asPayload(row.payload),
    createdAt: row.created_at,
  }));
}

export async function groupIdForFather(supabase: StaffClient, fatherId: string) {
  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("father_id", fatherId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return typeof data?.group_id === "string" ? data.group_id : null;
}
