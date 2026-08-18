import {
  loadAttemptResponses,
  loadPublishedPlatformAssessmentByKey,
  loadUserPlatformAttempt,
} from "@/lib/admin/platform-assessment-data";
import { localizedText } from "@/lib/admin/platform-assessments";
import {
  fatherCanStartAssessment,
  leaderCanStartAssessment,
  primaryFatherGroupId,
} from "@/lib/assessments/availability";
import {
  loadAssessmentAvailability,
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
} from "@/lib/assessments/data";
import { reviewForGroup } from "@/lib/assessments/reviews";
import { loadManagerGroups } from "@/lib/manager/data";
import { createClient } from "@/lib/supabase/server";

export async function loadPlatformTakeContext(input: {
  userId: string;
  role: "father" | "manager";
  assessmentKey: string;
}) {
  const assessment = await loadPublishedPlatformAssessmentByKey(input.assessmentKey);
  if (!assessment) return null;

  const items = assessment.instrument.domains.flatMap((domain) =>
    domain.items.map((item) => ({
      id: item.clientId,
      prompt: localizedText(item.prompt, item.promptHe, "en"),
      promptHe: item.promptHe,
      domainTitle: domain.title,
      domainTitleHe: domain.titleHe,
    }))
  );

  const attempt = await loadUserPlatformAttempt(input.userId, assessment.id);
  const answers = attempt ? await loadAttemptResponses(attempt.id) : new Map<string, number>();
  const allowed =
    attempt?.status === "completed"
      ? true
      : await canTakePublished(input.userId, input.role, input.assessmentKey, Boolean(attempt));

  return { assessment, items, attempt, answers, allowed };
}

async function canTakePublished(
  userId: string,
  role: "father" | "manager",
  assessmentKey: string,
  hasProgress: boolean
) {
  if (role === "manager") {
    const groups = await loadManagerGroups(userId);
    const groupIds = groups.map((group) => group.id);
    const [availability, reviews, release] = await Promise.all([
      loadAssessmentAvailability(groupIds),
      loadOrganizationAssessmentReviews(groupIds),
      loadPlatformAssessmentRelease(assessmentKey),
    ]);
    return leaderCanStartAssessment({
      rows: availability,
      groupIds,
      assessmentKey,
      hasProgress,
      release,
      reviewStatusForGroup: (groupId) =>
        reviewForGroup(reviews, groupId, assessmentKey)?.status ?? null,
    });
  }

  const supabase = await createClient();
  const [membershipsRes, profileRes] = await Promise.all([
    supabase.from("group_members").select("group_id").eq("father_id", userId),
    supabase.from("profiles").select("home_group_id").eq("id", userId).maybeSingle(),
  ]);
  if (membershipsRes.error) return false;
  const groupIds = [...new Set((membershipsRes.data ?? []).map((row) => String(row.group_id)))];
  const homeGroupId =
    typeof profileRes.data?.home_group_id === "string" ? profileRes.data.home_group_id : null;
  const [availability, reviews, release] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformAssessmentRelease(assessmentKey),
  ]);
  const groupId = primaryFatherGroupId(groupIds, homeGroupId);
  const review = groupId ? reviewForGroup(reviews, groupId, assessmentKey) : null;
  return fatherCanStartAssessment({
    rows: availability,
    groupIds,
    homeGroupId,
    assessmentKey,
    hasProgress,
    release,
    reviewStatus: review?.status ?? null,
  });
}
