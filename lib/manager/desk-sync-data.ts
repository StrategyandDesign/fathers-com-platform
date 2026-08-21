import "server-only";

import { deskSyncVersion } from "@/lib/manager/desk-sync";
import { loadGroupsForManager, loadOrgManagerIds } from "@/lib/org-staff/membership";
import { createClient } from "@/lib/supabase/server";

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

type CountLatest = { count: number; at: string };

function countLatest<T>(
  rows: T[] | null | undefined,
  at: (row: T) => string | null | undefined
): CountLatest {
  const list = rows ?? [];
  return { count: list.length, at: latestIso(list.map(at)) };
}

async function safeRows<T>(
  result: PromiseLike<{ data: T[] | null; error: { message?: string; code?: string } | null }>,
  name: string
): Promise<T[]> {
  const { data, error } = await result;
  if (error && !missingRelation(error, name)) throw error;
  return data ?? [];
}

/** Shared org stamp so every Leader on the same group refreshes together. */
export async function loadManagerDeskSyncVersion(managerId: string) {
  const supabase = await createClient();
  const groups = await loadGroupsForManager(managerId, supabase);
  const groupIds = groups.map((group) => group.id);
  if (groupIds.length === 0) return "empty";

  const managerIds = await loadOrgManagerIds(managerId, supabase);

  const [
    reviews,
    activityRows,
    notes,
    members,
    photos,
    assessmentReviews,
    assessmentAvailability,
    staff,
    customAssessments,
  ] = await Promise.all([
    safeRows<{ group_id: string; training_id: string; status: string; decided_at: string | null }>(
      supabase
        .from("organization_training_reviews")
        .select("group_id, training_id, status, decided_at")
        .in("group_id", groupIds),
      "organization_training_reviews"
    ),
    safeRows<{ id: string; created_at: string }>(
      supabase
        .from("organization_activity")
        .select("id, created_at")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(1),
      "organization_activity"
    ),
    safeRows<{ id: string; updated_at: string | null }>(
      supabase.from("organization_cohort_notes").select("id, updated_at").in("group_id", groupIds),
      "organization_cohort_notes"
    ),
    safeRows<{ father_id: string; joined_at: string | null }>(
      supabase.from("group_members").select("father_id, joined_at").in("group_id", groupIds),
      "group_members"
    ),
    safeRows<{ updated_at: string | null }>(
      supabase.from("organization_photos").select("updated_at").in("group_id", groupIds),
      "organization_photos"
    ),
    safeRows<{ group_id: string; assessment_key: string; status: string; decided_at: string | null }>(
      supabase
        .from("organization_assessment_reviews")
        .select("group_id, assessment_key, status, decided_at")
        .in("group_id", groupIds),
      "organization_assessment_reviews"
    ),
    safeRows<{ group_id: string; assessment_key: string; status: string; decided_at: string | null }>(
      supabase
        .from("organization_assessment_availability")
        .select("group_id, assessment_key, status, decided_at")
        .in("group_id", groupIds),
      "organization_assessment_availability"
    ),
    safeRows<{ added_at: string | null }>(
      supabase.from("organization_staff").select("added_at").in("group_id", groupIds),
      "organization_staff"
    ),
    safeRows<{ updated_at: string | null }>(
      supabase.from("custom_assessments").select("updated_at").in("manager_id", managerIds),
      "custom_assessments"
    ),
  ]);

  const fatherIds = [...new Set(members.map((row) => row.father_id))];
  const empty: CountLatest = { count: 0, at: "" };
  const [
    assignments,
    certificates,
    progress,
    assessmentAssignments,
    participantNotes,
    nudges,
  ] =
    fatherIds.length === 0
      ? [empty, empty, empty, empty, empty, empty]
      : await Promise.all([
          safeRows<{ assigned_at: string | null }>(
            supabase.from("training_assignments").select("assigned_at").in("father_id", fatherIds),
            "training_assignments"
          ).then((rows) => countLatest(rows, (row) => row.assigned_at)),
          safeRows<{ issued_at: string | null }>(
            supabase.from("certificates").select("issued_at").in("father_id", fatherIds),
            "certificates"
          ).then((rows) => countLatest(rows, (row) => row.issued_at)),
          safeRows<{ completed_at: string | null }>(
            supabase.from("session_progress").select("completed_at").in("father_id", fatherIds),
            "session_progress"
          ).then((rows) => countLatest(rows, (row) => row.completed_at)),
          safeRows<{ created_at: string | null; completed_at: string | null }>(
            supabase
              .from("custom_assessment_assignments")
              .select("created_at, completed_at")
              .in("father_id", fatherIds),
            "custom_assessment_assignments"
          ).then((rows) =>
            countLatest(rows, (row) => row.completed_at || row.created_at)
          ),
          safeRows<{ created_at: string | null }>(
            supabase
              .from("manager_participant_notes")
              .select("created_at")
              .in("father_id", fatherIds),
            "manager_participant_notes"
          ).then((rows) => countLatest(rows, (row) => row.created_at)),
          safeRows<{ sent_at: string | null }>(
            supabase.from("manager_nudges").select("sent_at").in("father_id", fatherIds),
            "manager_nudges"
          ).then((rows) => countLatest(rows, (row) => row.sent_at)),
        ]);

  const activity = activityRows[0] ?? null;
  const photosStamp = countLatest(photos, (row) => row.updated_at);
  const staffStamp = countLatest(staff, (row) => row.added_at);
  const membersStamp = countLatest(members, (row) => row.joined_at);
  const customStamp = countLatest(customAssessments, (row) => row.updated_at);

  return deskSyncVersion({
    reviews: reviews.map((row) => ({
      group_id: row.group_id,
      training_id: row.training_id,
      status: row.status,
      decided_at: row.decided_at,
    })),
    notes,
    activityId: activity?.id ?? "",
    activityAt: activity?.created_at ?? "",
    assignmentCount: assignments.count,
    assignmentAt: assignments.at,
    certificateCount: certificates.count,
    certificateAt: certificates.at,
    progressCount: progress.count,
    progressAt: progress.at,
    photoCount: photosStamp.count,
    photoAt: photosStamp.at,
    assessmentReviews: assessmentReviews.map((row) => ({
      group_id: row.group_id,
      training_id: row.assessment_key,
      status: row.status,
      decided_at: row.decided_at,
    })),
    assessmentAvailability: assessmentAvailability.map((row) => ({
      group_id: row.group_id,
      training_id: row.assessment_key,
      status: row.status,
      decided_at: row.decided_at,
    })),
    assessmentAssignmentCount: assessmentAssignments.count,
    assessmentAssignmentAt: assessmentAssignments.at,
    customAssessmentCount: customStamp.count,
    customAssessmentAt: customStamp.at,
    participantNoteCount: participantNotes.count,
    participantNoteAt: participantNotes.at,
    nudgeCount: nudges.count,
    nudgeAt: nudges.at,
    staffCount: staffStamp.count,
    staffAt: staffStamp.at,
    memberCount: membersStamp.count,
    memberAt: membersStamp.at,
    participation: groups
      .map((group) => `${group.id}:${group.participation_mode ?? ""}`)
      .sort()
      .join(","),
  });
}
