import { displayName, type ManagedProfile } from "@/lib/manager/types";
import { createClient } from "@/lib/supabase/server";
import {
  KEYSTONE_ASSESSMENT_KEY,
  asAvailabilityRow,
  fatherCanStartAssessment,
  leaderCanStartAssessment,
  primaryFatherGroupId,
  type AssessmentAvailabilityRow,
} from "@/lib/assessments/availability";
import { isLeaderSelfRow } from "@/lib/practice/paths";
import { loadManagerGroups } from "@/lib/manager/data";
import { loadOrgManagerIds } from "@/lib/org-staff/membership";
import {
  isAssessmentReviewStatus,
  reviewForGroup,
  type OrganizationAssessmentReview,
  type PlatformAssessmentRelease,
} from "@/lib/assessments/reviews";
import {
  asStringOptions,
  isAssignmentStatus,
  isQuestionType,
  type AssessmentListItem,
  type AssignmentRow,
  type CustomAssessment,
  type CustomAssessmentAnswer,
  type CustomAssessmentAssignment,
  type CustomAssessmentQuestion,
  type FatherAssignmentCard,
  type RosterFather,
} from "@/lib/assessments/types";

function emptyIn<T>(
  ids: string[],
  load: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  if (ids.length === 0) {
    return Promise.resolve({ data: [] as T[], error: null });
  }
  return load();
}

function asAssessment(row: CustomAssessment): CustomAssessment {
  return row;
}

function asQuestion(row: {
  id: string;
  assessment_id: string;
  order_index: number;
  prompt: string;
  question_type: string;
  options: unknown;
}): CustomAssessmentQuestion | null {
  if (!isQuestionType(row.question_type)) return null;
  return {
    id: row.id,
    assessment_id: row.assessment_id,
    order_index: row.order_index,
    prompt: row.prompt,
    question_type: row.question_type,
    options: row.question_type === "single_select" ? asStringOptions(row.options) : null,
  };
}

function asAssignment(row: CustomAssessmentAssignment): CustomAssessmentAssignment | null {
  if (!isAssignmentStatus(row.status)) return null;
  return row;
}

export async function loadManagerRoster(managerId: string): Promise<RosterFather[]> {
  const supabase = await createClient();
  const { loadGroupsForManager } = await import("@/lib/org-staff/membership");
  const groups = await loadGroupsForManager(managerId, supabase);
  const groupIds = groups.map((group) => group.id);

  const membersRes = await emptyIn<{ father_id: string; group_id: string }>(groupIds, () =>
    supabase.from("group_members").select("father_id, group_id").in("group_id", groupIds)
  );
  if (membersRes.error) throw membersRes.error;

  const groupByFather = new Map<string, string>();
  for (const row of membersRes.data ?? []) {
    if (!groupByFather.has(row.father_id)) {
      groupByFather.set(row.father_id, row.group_id);
    }
  }
  const fatherIds = [...groupByFather.keys()];
  const profilesRes = await emptyIn<ManagedProfile>(fatherIds, () =>
    supabase.from("profiles").select("id, full_name").in("id", fatherIds)
  );
  if (profilesRes.error) throw profilesRes.error;

  const profiles = new Map((profilesRes.data ?? []).map((profile) => [profile.id, profile]));
  return fatherIds
    .map((fatherId) => ({
      fatherId,
      name: displayName(profiles.get(fatherId) ?? null, fatherId),
      groupId: groupByFather.get(fatherId) ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function missingAssessmentReviewRelation(error: { code?: string; message: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /organization_assessment_reviews|platform_assessment_releases/i.test(error.message)
  );
}

export async function loadPlatformAssessmentRelease(assessmentKey: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessment_releases")
    .select("assessment_key, released_at, first_released_at, released_by")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();

  if (error) {
    if (missingAssessmentReviewRelation(error)) return null;
    throw error;
  }
  return (data as PlatformAssessmentRelease | null) ?? null;
}

export async function loadOrganizationAssessmentReviews(groupIds: string[]) {
  if (groupIds.length === 0) return [] as OrganizationAssessmentReview[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_assessment_reviews")
    .select(
      "group_id, assessment_key, status, decline_reason, decided_by, decided_at, created_at"
    )
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (missingAssessmentReviewRelation(error)) return [];
    throw error;
  }

  const rows: OrganizationAssessmentReview[] = [];
  for (const row of (data ?? []) as Array<
    Omit<OrganizationAssessmentReview, "status"> & { status: string }
  >) {
    if (!isAssessmentReviewStatus(row.status)) continue;
    rows.push({ ...row, status: row.status });
  }
  return rows;
}

export async function markAssessmentNotificationsRead(
  managerId: string,
  assessmentKey: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("manager_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("manager_id", managerId)
    .eq("kind", "assessment_release")
    .eq("assessment_key", assessmentKey)
    .is("read_at", null);

  if (error) {
    const missingColumn =
      error.code === "42703" || /assessment_key/i.test(error.message);
    if (missingColumn) return;
    console.error("[assessment-reviews] mark read failed", error.message);
  }
}

export async function loadAssessmentAvailability(
  groupIds: string[]
): Promise<AssessmentAvailabilityRow[]> {
  const supabase = await createClient();
  const result = await emptyIn<{
    group_id: string;
    assessment_key: string;
    status: string;
    decided_at: string | null;
    decided_by: string | null;
  }>(groupIds, () =>
    supabase
      .from("organization_assessment_availability")
      .select("group_id, assessment_key, status, decided_at, decided_by")
      .in("group_id", groupIds)
  );
  if (result.error) throw result.error;
  return (result.data ?? [])
    .map(asAvailabilityRow)
    .filter((row): row is AssessmentAvailabilityRow => row !== null);
}

export async function loadFatherAssessmentAccess(fatherId: string) {
  const supabase = await createClient();
  const [membershipsRes, profileRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id")
      .eq("father_id", fatherId)
      .order("joined_at", { ascending: true }),
    supabase.from("profiles").select("home_group_id").eq("id", fatherId).maybeSingle(),
  ]);
  if (membershipsRes.error) throw membershipsRes.error;
  if (profileRes.error) throw profileRes.error;

  const groupIds = [...new Set((membershipsRes.data ?? []).map((row) => String(row.group_id)))];
  const homeGroupId =
    typeof profileRes.data?.home_group_id === "string" ? profileRes.data.home_group_id : null;
  const [availability, reviews, keystoneRelease] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformAssessmentRelease(KEYSTONE_ASSESSMENT_KEY),
  ]);
  const groupId = primaryFatherGroupId(groupIds, homeGroupId);
  const review = groupId
    ? reviewForGroup(reviews, groupId, KEYSTONE_ASSESSMENT_KEY)
    : null;

  return {
    groupIds,
    homeGroupId,
    availability,
    reviews,
    keystoneRelease,
    canStartKeystone: fatherCanStartAssessment({
      rows: availability,
      groupIds,
      homeGroupId,
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      release: keystoneRelease,
      reviewStatus: review?.status ?? null,
    }),
  };
}

export async function loadLeaderAssessmentAccess(
  managerId: string,
  hasKeystoneProgress = false
) {
  const groups = await loadManagerGroups(managerId);
  const groupIds = groups.map((group) => group.id);
  const [availability, reviews, keystoneRelease] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformAssessmentRelease(KEYSTONE_ASSESSMENT_KEY),
  ]);

  return {
    groupIds,
    availability,
    reviews,
    keystoneRelease,
    canStartKeystone: leaderCanStartAssessment({
      rows: availability,
      groupIds,
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      hasProgress: hasKeystoneProgress,
      release: keystoneRelease,
      reviewStatusForGroup: (groupId) =>
        reviewForGroup(reviews, groupId, KEYSTONE_ASSESSMENT_KEY)?.status ?? null,
    }),
  };
}

export async function loadManagerAssessments(managerId: string): Promise<AssessmentListItem[]> {
  const supabase = await createClient();
  const managerIds = await loadOrgManagerIds(managerId);
  const { data, error } = await supabase
    .from("custom_assessments")
    .select("*")
    .in("manager_id", managerIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const assessments = (data ?? []) as CustomAssessment[];
  const ids = assessments.map((row) => row.id);

  const [questionsRes, assignmentsRes] = await Promise.all([
    emptyIn<{ assessment_id: string }>(ids, () =>
      supabase.from("custom_assessment_questions").select("assessment_id").in("assessment_id", ids)
    ),
    emptyIn<{ assessment_id: string; status: string; father_id: string }>(ids, () =>
      supabase
        .from("custom_assessment_assignments")
        .select("assessment_id, status, father_id")
        .in("assessment_id", ids)
    ),
  ]);
  if (questionsRes.error) throw questionsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  return assessments.map((assessment) => {
    const questionCount = (questionsRes.data ?? []).filter(
      (row) => row.assessment_id === assessment.id
    ).length;
    const assigned = (assignmentsRes.data ?? []).filter(
      (row) => row.assessment_id === assessment.id && !isLeaderSelfRow(row.father_id, managerId)
    );
    return {
      ...asAssessment(assessment),
      questionCount,
      assignedCount: assigned.length,
      completedCount: assigned.filter((row) => row.status === "completed").length,
    };
  });
}

export async function loadManagerAssessmentDetail(managerId: string, assessmentId: string) {
  const supabase = await createClient();
  const managerIds = await loadOrgManagerIds(managerId);
  const { data, error } = await supabase
    .from("custom_assessments")
    .select("*")
    .eq("id", assessmentId)
    .in("manager_id", managerIds)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [questionsRes, assignmentsRes, roster] = await Promise.all([
    supabase
      .from("custom_assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("order_index"),
    supabase
      .from("custom_assessment_assignments")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at"),
    loadManagerRoster(managerId),
  ]);

  if (questionsRes.error) throw questionsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const questions = ((questionsRes.data ?? []) as Parameters<typeof asQuestion>[0][])
    .map(asQuestion)
    .filter((row): row is CustomAssessmentQuestion => row !== null);
  const assignments = ((assignmentsRes.data ?? []) as CustomAssessmentAssignment[])
    .map(asAssignment)
    .filter((row): row is CustomAssessmentAssignment => row !== null);

  const names = new Map(roster.map((row) => [row.fatherId, row.name]));
  const assignmentRows: AssignmentRow[] = assignments
    .filter((row) => !isLeaderSelfRow(row.father_id, managerId))
    .map((row) => ({
    ...row,
    fatherName: names.get(row.father_id) ?? displayName(null, row.father_id),
  }));
  assignmentRows.sort((a, b) => a.fatherName.localeCompare(b.fatherName));

  return {
    assessment: asAssessment(data as CustomAssessment),
    questions,
    assignments: assignmentRows,
    roster,
  };
}

export async function loadManagerAssignmentResponses(
  managerId: string,
  assessmentId: string,
  fatherId: string
) {
  const detail = await loadManagerAssessmentDetail(managerId, assessmentId);
  if (!detail) return null;

  const assignment = detail.assignments.find((row) => row.father_id === fatherId);
  if (!assignment) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_assessment_answers")
    .select("*")
    .eq("assignment_id", assignment.id);

  if (error) throw error;

  const answers = new Map(
    ((data ?? []) as CustomAssessmentAnswer[]).map((row) => [row.question_id, row])
  );

  return {
    assessment: detail.assessment,
    questions: detail.questions,
    assignment,
    answers,
  };
}

export async function loadParticipantCustomAssignments(managerId: string, fatherId: string) {
  const supabase = await createClient();
  const { data: managed, error: managedError } = await supabase.rpc("manages_father", {
    father_id: fatherId,
  });
  if (managedError) throw managedError;
  if (!managed) return [];

  const { data, error } = await supabase
    .from("custom_assessment_assignments")
    .select("*")
    .eq("father_id", fatherId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const assignments = ((data ?? []) as CustomAssessmentAssignment[])
    .map(asAssignment)
    .filter((row): row is CustomAssessmentAssignment => row !== null);
  const assessmentIds = [...new Set(assignments.map((row) => row.assessment_id))];
  const managerIds = await loadOrgManagerIds(managerId);

  const assessmentsRes = await emptyIn<CustomAssessment>(assessmentIds, () =>
    supabase
      .from("custom_assessments")
      .select("*")
      .in("manager_id", managerIds)
      .in("id", assessmentIds)
  );
  if (assessmentsRes.error) throw assessmentsRes.error;

  const assessments = new Map(
    ((assessmentsRes.data ?? []) as CustomAssessment[]).map((row) => [row.id, row])
  );

  return assignments
    .map((assignment) => {
      const assessment = assessments.get(assignment.assessment_id);
      if (!assessment) return null;
      return { assignment, assessment };
    })
    .filter((row): row is { assignment: CustomAssessmentAssignment; assessment: CustomAssessment } =>
      row !== null
    );
}

export async function loadFatherAssignments(fatherId: string): Promise<FatherAssignmentCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_assessment_assignments")
    .select("*")
    .eq("father_id", fatherId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const assignments = ((data ?? []) as CustomAssessmentAssignment[])
    .map(asAssignment)
    .filter((row): row is CustomAssessmentAssignment => row !== null);
  const assessmentIds = [...new Set(assignments.map((row) => row.assessment_id))];
  const assignmentIds = assignments.map((row) => row.id);

  const [assessmentsRes, questionsRes, answersRes] = await Promise.all([
    emptyIn<CustomAssessment>(assessmentIds, () =>
      supabase.from("custom_assessments").select("*").in("id", assessmentIds)
    ),
    emptyIn<{ assessment_id: string }>(assessmentIds, () =>
      supabase
        .from("custom_assessment_questions")
        .select("assessment_id")
        .in("assessment_id", assessmentIds)
    ),
    emptyIn<{ assignment_id: string }>(assignmentIds, () =>
      supabase
        .from("custom_assessment_answers")
        .select("assignment_id")
        .in("assignment_id", assignmentIds)
    ),
  ]);
  if (assessmentsRes.error) throw assessmentsRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (answersRes.error) throw answersRes.error;

  const assessments = new Map(
    ((assessmentsRes.data ?? []) as CustomAssessment[]).map((row) => [row.id, row])
  );

  return assignments
    .map((assignment) => {
      const assessment = assessments.get(assignment.assessment_id);
      if (!assessment) return null;
      return {
        assignment,
        assessment,
        questionCount: (questionsRes.data ?? []).filter(
          (row) => row.assessment_id === assignment.assessment_id
        ).length,
        answeredCount: (answersRes.data ?? []).filter((row) => row.assignment_id === assignment.id)
          .length,
      };
    })
    .filter((row): row is FatherAssignmentCard => row !== null);
}

export async function loadAssignmentTake(fatherId: string, assignmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_assessment_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("father_id", fatherId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const assignment = asAssignment(data as CustomAssessmentAssignment);
  if (!assignment) return null;

  const [assessmentRes, questionsRes, answersRes] = await Promise.all([
    supabase
      .from("custom_assessments")
      .select("*")
      .eq("id", assignment.assessment_id)
      .maybeSingle(),
    supabase
      .from("custom_assessment_questions")
      .select("*")
      .eq("assessment_id", assignment.assessment_id)
      .order("order_index"),
    supabase.from("custom_assessment_answers").select("*").eq("assignment_id", assignment.id),
  ]);

  if (assessmentRes.error) throw assessmentRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (answersRes.error) throw answersRes.error;
  if (!assessmentRes.data) return null;

  const questions = ((questionsRes.data ?? []) as Parameters<typeof asQuestion>[0][])
    .map(asQuestion)
    .filter((row): row is CustomAssessmentQuestion => row !== null);

  const answers = new Map(
    ((answersRes.data ?? []) as CustomAssessmentAnswer[]).map((row) => [row.question_id, row.value])
  );

  return {
    assignment,
    assessment: asAssessment(assessmentRes.data as CustomAssessment),
    questions,
    answers,
  };
}
