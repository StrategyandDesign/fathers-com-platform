import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import {
  KEYSTONE_ASSESSMENT_KEY,
  customAssessmentKey,
  type AssessmentAvailabilityRow,
  type AssessmentVisibility,
} from "@/lib/assessments/availability";
import {
  catalogVisibility,
  isAssessmentCurrentlyReleased,
  isLegacyCatalogAssessment,
  reviewForGroup,
  type AssessmentReviewStatus,
  type OrganizationAssessmentReview,
  type PlatformAssessmentRelease,
} from "@/lib/assessments/reviews";
import type { AssessmentListItem } from "@/lib/assessments/types";

export type AssessmentCatalogKind = "keystone" | "custom" | "platform";
export type AssessmentCatalogSection = "pending" | "available" | "hidden" | "declined";

export type AssessmentCatalogItem = {
  key: string;
  assessmentKey: string;
  kind: AssessmentCatalogKind;
  status: AssessmentVisibility;
  section: AssessmentCatalogSection;
  reviewStatus: AssessmentReviewStatus | null;
  groupId: string;
  groupName?: string;
  href: string;
  questionCount: number;
  assignedCount: number;
  completedCount: number;
  customId?: string;
  title?: string;
  description?: string | null;
};

function releasedPlatformSection(input: {
  release?: PlatformAssessmentRelease | null;
  reviewStatus: AssessmentReviewStatus | null;
  status: AssessmentVisibility;
  allowLegacy?: boolean;
}): AssessmentCatalogSection | null {
  if (input.allowLegacy && isLegacyCatalogAssessment(input.release)) {
    return input.status === "hidden" ? "hidden" : "available";
  }
  if (!isAssessmentCurrentlyReleased(input.release)) return null;
  if (input.reviewStatus === "pending") return "pending";
  if (input.reviewStatus === "declined") return "declined";
  if (input.reviewStatus === "accepted") {
    return input.status === "hidden" ? "hidden" : "available";
  }
  return null;
}

export type PlatformCatalogSource = {
  assessmentKey: string;
  title: string;
  description: string | null;
  questionCount: number;
  completedByGroup: Record<string, number>;
  release?: PlatformAssessmentRelease | null;
};

export function buildManagerAssessmentCatalog(input: {
  groups: Array<{ id: string; name: string }>;
  custom: AssessmentListItem[];
  availability: AssessmentAvailabilityRow[];
  keystoneCompletedByGroup: Record<string, number>;
  groupSize: Record<string, number>;
  reviews?: OrganizationAssessmentReview[];
  keystoneRelease?: PlatformAssessmentRelease | null;
  platform?: PlatformCatalogSource[];
}): AssessmentCatalogItem[] {
  const showGroupName = input.groups.length > 1;
  const items: AssessmentCatalogItem[] = [];
  const groups = input.groups.length > 0 ? input.groups : [];
  const reviews = input.reviews ?? [];

  if (groups.length === 0) {
    return input.custom.map((assessment) => ({
      key: assessment.id,
      assessmentKey: customAssessmentKey(assessment.id),
      kind: "custom" as const,
      status: "available" as const,
      section: "available" as const,
      reviewStatus: null,
      groupId: "",
      href: `/manager/assessments/${assessment.id}`,
      questionCount: assessment.questionCount,
      assignedCount: assessment.assignedCount,
      completedCount: assessment.completedCount,
      customId: assessment.id,
      title: assessment.title,
      description: assessment.description,
    }));
  }

  for (const group of groups) {
    const review = reviewForGroup(reviews, group.id, KEYSTONE_ASSESSMENT_KEY);
    const status = catalogVisibility({
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      groupId: group.id,
      availability: input.availability,
      reviewStatus: review?.status ?? null,
    });
    const section = releasedPlatformSection({
      release: input.keystoneRelease,
      reviewStatus: review?.status ?? null,
      status,
      allowLegacy: true,
    });
    if (!section) continue;

    items.push({
      key: `${group.id}:${KEYSTONE_ASSESSMENT_KEY}`,
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      kind: "keystone",
      status,
      section,
      reviewStatus: review?.status ?? null,
      groupId: group.id,
      groupName: showGroupName ? group.name : undefined,
      href:
        section === "pending" || section === "declined"
          ? `/manager/assessment-reviews/keystone?group=${group.id}`
          : `/manager/assessments/keystone?group=${group.id}`,
      questionCount: PROFILE_QUESTION_COUNT,
      assignedCount: input.groupSize[group.id] ?? 0,
      completedCount: input.keystoneCompletedByGroup[group.id] ?? 0,
    });
  }

  for (const platform of input.platform ?? []) {
    for (const group of groups) {
      const review = reviewForGroup(reviews, group.id, platform.assessmentKey);
      const status = catalogVisibility({
        assessmentKey: platform.assessmentKey,
        groupId: group.id,
        availability: input.availability,
        reviewStatus: review?.status ?? null,
      });
      const section = releasedPlatformSection({
        release: platform.release,
        reviewStatus: review?.status ?? null,
        status,
      });
      if (!section) continue;

      items.push({
        key: `${group.id}:${platform.assessmentKey}`,
        assessmentKey: platform.assessmentKey,
        kind: "platform",
        status,
        section,
        reviewStatus: review?.status ?? null,
        groupId: group.id,
        groupName: showGroupName ? group.name : undefined,
        href:
          section === "pending" || section === "declined"
            ? `/manager/assessment-reviews/${platform.assessmentKey}?group=${group.id}`
            : `/manager/assessments/platform/${platform.assessmentKey}?group=${group.id}`,
        questionCount: platform.questionCount,
        assignedCount: input.groupSize[group.id] ?? 0,
        completedCount: platform.completedByGroup[group.id] ?? 0,
        title: platform.title,
        description: platform.description,
      });
    }
  }

  for (const assessment of input.custom) {
    for (const group of groups) {
      const assessmentKey = customAssessmentKey(assessment.id);
      const status = catalogVisibility({
        assessmentKey,
        groupId: group.id,
        availability: input.availability,
      });
      items.push({
        key: `${group.id}:${assessmentKey}`,
        assessmentKey,
        kind: "custom",
        status,
        section: status === "hidden" ? "hidden" : "available",
        reviewStatus: null,
        groupId: group.id,
        groupName: showGroupName ? group.name : undefined,
        href: `/manager/assessments/${assessment.id}`,
        questionCount: assessment.questionCount,
        assignedCount: assessment.assignedCount,
        completedCount: assessment.completedCount,
        customId: assessment.id,
        title: assessment.title,
        description: assessment.description,
      });
    }
  }

  return items;
}

export function partitionAssessmentCatalog(items: AssessmentCatalogItem[]) {
  return {
    pending: items.filter((item) => item.section === "pending"),
    available: items.filter((item) => item.section === "available"),
    hidden: items.filter((item) => item.section === "hidden"),
    declined: items.filter((item) => item.section === "declined"),
  };
}
