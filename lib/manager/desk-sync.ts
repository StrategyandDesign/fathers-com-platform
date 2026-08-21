export const DESK_SYNC_INTERVAL_MS = 2000;
export const DESK_SYNC_PATH = "/api/manager/desk-sync";

export type DeskSyncReview = {
  group_id: string;
  training_id: string;
  status: string;
  decided_at?: string | null;
};

export type DeskSyncNote = {
  id: string;
  updated_at?: string | null;
};

export function reviewDecisionStamp(reviews: DeskSyncReview[]) {
  return [...reviews]
    .map((row) => `${row.group_id}:${row.training_id}:${row.status}:${row.decided_at ?? ""}`)
    .sort()
    .join(",");
}

export function deskSyncVersion(input: {
  reviews?: DeskSyncReview[];
  notes?: DeskSyncNote[];
  activityId?: string | null;
  activityAt?: string | null;
  assignmentCount?: number;
  assignmentAt?: string | null;
}) {
  const reviews = reviewDecisionStamp(input.reviews ?? []);
  const notes = [...(input.notes ?? [])]
    .map((row) => `${row.id}:${row.updated_at ?? ""}`)
    .sort()
    .join(",");
  return [
    reviews || "none",
    notes || "none",
    input.activityId ?? "",
    input.activityAt ?? "",
    String(input.assignmentCount ?? 0),
    input.assignmentAt ?? "",
  ].join("|");
}

export function shouldRefreshDesk(current: string | null, next: string) {
  return Boolean(current && next && current !== next);
}

export function isDeskEditingTarget(el: { tagName?: string; isContentEditable?: boolean } | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(el.isContentEditable);
}

export function shouldHoldDeskRefresh(input: { hidden: boolean; editing: boolean }) {
  return input.hidden || input.editing;
}

function missingRelation(error: { message?: string; code?: string } | null, name: string) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    new RegExp(name, "i").test(error.message ?? "")
  );
}

function latestIso(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? "";
}

/** Shared org stamp so every Leader on the same group refreshes together. */
export async function loadManagerDeskSyncVersion(managerId: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const { loadGroupsForManager } = await import("@/lib/org-staff/membership");

  const supabase = await createClient();
  const groups = await loadGroupsForManager(managerId, supabase);
  const groupIds = groups.map((group) => group.id);
  if (groupIds.length === 0) return "empty";

  const [reviewsRes, activityRes, notesRes, membersRes] = await Promise.all([
    supabase
      .from("organization_training_reviews")
      .select("group_id, training_id, status, decided_at")
      .in("group_id", groupIds),
    supabase
      .from("organization_activity")
      .select("id, created_at")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("organization_cohort_notes")
      .select("id, updated_at")
      .in("group_id", groupIds),
    supabase.from("group_members").select("father_id").in("group_id", groupIds),
  ]);

  if (reviewsRes.error && !missingRelation(reviewsRes.error, "organization_training_reviews")) {
    throw reviewsRes.error;
  }
  if (activityRes.error && !missingRelation(activityRes.error, "organization_activity")) {
    throw activityRes.error;
  }
  if (notesRes.error && !missingRelation(notesRes.error, "organization_cohort_notes")) {
    throw notesRes.error;
  }

  const fatherIds = [
    ...new Set(
      ((membersRes.data ?? []) as Array<{ father_id: string }>).map((row) => row.father_id)
    ),
  ];
  let assignmentCount = 0;
  let assignmentAt = "";
  if (fatherIds.length > 0) {
    const assignmentsRes = await supabase
      .from("training_assignments")
      .select("assigned_at")
      .in("father_id", fatherIds);
    if (assignmentsRes.error && !missingRelation(assignmentsRes.error, "training_assignments")) {
      throw assignmentsRes.error;
    }
    const assigned = (assignmentsRes.data ?? []) as Array<{ assigned_at: string | null }>;
    assignmentCount = assigned.length;
    assignmentAt = latestIso(assigned.map((row) => row.assigned_at));
  }

  const activity = ((activityRes.data ?? []) as Array<{ id?: string; created_at?: string }>)[0] ?? null;

  return deskSyncVersion({
    reviews: (reviewsRes.data ?? []) as DeskSyncReview[],
    notes: (notesRes.data ?? []) as DeskSyncNote[],
    activityId: activity?.id ?? "",
    activityAt: activity?.created_at ?? "",
    assignmentCount,
    assignmentAt,
  });
}
