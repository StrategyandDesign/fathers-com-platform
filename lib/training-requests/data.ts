import { createClient } from "@/lib/supabase/server";
import {
  isTrainingRequestStatus,
  type TrainingRequestFilter,
  type TrainingRequestRow,
} from "@/lib/training-requests/types";

const LOAD_FAILED = "Unable to load training requests right now.";

function asRequest(row: Record<string, unknown>): TrainingRequestRow | null {
  if (!isTrainingRequestStatus(row.status)) return null;
  if (typeof row.id !== "string" || typeof row.manager_id !== "string") return null;
  if (typeof row.topic !== "string" || typeof row.description !== "string") return null;
  if (typeof row.created_at !== "string") return null;

  return {
    id: row.id,
    managerId: row.manager_id,
    groupId: typeof row.group_id === "string" ? row.group_id : null,
    organizationName:
      typeof row.organization_name === "string" && row.organization_name.trim()
        ? row.organization_name.trim()
        : null,
    topic: row.topic,
    description: row.description,
    audience: typeof row.audience === "string" && row.audience.trim() ? row.audience : null,
    status: row.status,
    createdAt: row.created_at,
    decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
  };
}

const REQUEST_COLUMNS =
  "id, manager_id, group_id, organization_name, topic, description, audience, status, created_at, decided_at";

export async function loadOpenTrainingRequestCount(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("training_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "considering"]);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export async function loadTrainingRequestInbox(filter: TrainingRequestFilter): Promise<{
  rows: TrainingRequestRow[];
  names: Record<string, string>;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const query = supabase
      .from("training_requests")
      .select(REQUEST_COLUMNS)
      .order("created_at", { ascending: false });

    const { data, error } =
      filter === "closed"
        ? await query.in("status", ["planned", "declined"])
        : await query.in("status", ["new", "considering"]);

    if (error) return { rows: [], names: {}, error: LOAD_FAILED };

    const rows = ((data ?? []) as Record<string, unknown>[])
      .map(asRequest)
      .filter((row): row is TrainingRequestRow => Boolean(row));

    const managerIds = [...new Set(rows.map((row) => row.managerId))];
    const names: Record<string, string> = {};
    if (managerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", managerIds);
      for (const profile of profiles ?? []) {
        if (
          typeof profile.id === "string" &&
          typeof profile.full_name === "string" &&
          profile.full_name.trim()
        ) {
          names[profile.id] = profile.full_name.trim();
        }
      }
    }

    return { rows, names, error: null };
  } catch {
    return { rows: [], names: {}, error: LOAD_FAILED };
  }
}

export async function loadTrainingRequest(id: string): Promise<{
  request: TrainingRequestRow | null;
  managerName: string | null;
  error: string | null;
}> {
  const empty = {
    request: null,
    managerName: null,
    error: null as string | null,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("training_requests")
      .select(REQUEST_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) return { ...empty, error: LOAD_FAILED };
    if (!data) return empty;

    const request = asRequest(data as Record<string, unknown>);
    if (!request) return empty;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", request.managerId)
      .maybeSingle();

    const managerName =
      typeof profile?.full_name === "string" && profile.full_name.trim()
        ? profile.full_name.trim()
        : null;

    return { request, managerName, error: null };
  } catch {
    return { ...empty, error: LOAD_FAILED };
  }
}
