import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import {
  KEYSTONE_ASSESSMENT_KEY,
  customAssessmentKey,
  type AssessmentAvailabilityRow,
  type AssessmentVisibility,
} from "@/lib/assessments/availability";
import {
  firstPartyManagerPath,
  firstPartyReviewPath,
  listFirstPartyAssessments,
  type FirstPartyAssessment,
} from "@/lib/assessments/first-party";
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
export type AssessmentCatalogDecision = "pending" | "ready" | "catalog" | "declined";

export type AssessmentCatalogItem = {
  key: string;
  assessmentKey: string;
  kind: AssessmentCatalogKind;
  status: AssessmentVisibility;
  section: AssessmentCatalogSection;
  decision: AssessmentCatalogDecision;
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

export function catalogAssessmentCanReview(kind: AssessmentCatalogKind) {
  return kind !== "custom";
}

function platformSection(input: {
  assessmentKey: string;
  release?: PlatformAssessmentRelease | null;
  reviewStatus: AssessmentReviewStatus | null;
  status: AssessmentVisibility;
}): AssessmentCatalogSection | null {
  if (
    input.assessmentKey === KEYSTONE_ASSESSMENT_KEY &&
    isLegacyCatalogAssessment(input.release, input.assessmentKey)
  ) {
    if (input.reviewStatus === "pending") return "pending";
    if (input.reviewStatus === "declined") return "declined";
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

function catalogDeskHref(input: {
  kind: AssessmentCatalogKind;
  assessmentKey: string;
  groupId: string;
  section: AssessmentCatalogSection;
  release?: PlatformAssessmentRelease | null;
}) {
  const reviewDesk =
    (input.section === "pending" || input.section === "declined") &&
    isAssessmentCurrentlyReleased(input.release);
  if (input.kind === "keystone") {
    return reviewDesk
      ? `/manager/assessment-reviews/keystone?group=${input.groupId}#instrument`
      : `/manager/assessments/keystone?group=${input.groupId}#instrument`;
  }
  return reviewDesk
    ? `${firstPartyReviewPath(input.assessmentKey)}?group=${input.groupId}#instrument`
    : `${firstPartyManagerPath(input.assessmentKey)}?group=${input.groupId}#instrument`;
}

export function assessmentCatalogDecision(input: {
  kind: AssessmentCatalogKind;
  section: AssessmentCatalogSection;
  reviewStatus: AssessmentReviewStatus | null;
  status?: AssessmentVisibility;
}): AssessmentCatalogDecision {
  if (input.reviewStatus === "pending" || input.section === "pending") return "pending";
  if (input.reviewStatus === "declined" || input.section === "declined") return "declined";
  if (input.reviewStatus === "accepted") return "ready";
  if (input.kind === "custom" && input.status === "hidden") return "pending";
  return "catalog";
}

function withDecision(
  item: Omit<AssessmentCatalogItem, "decision">
): AssessmentCatalogItem {
  return {
    ...item,
    decision: assessmentCatalogDecision(item),
  };
}

export function buildManagerAssessmentCatalog(input: {
  groups: Array<{ id: string; name: string }>;
  custom: AssessmentListItem[];
  availability: AssessmentAvailabilityRow[];
  keystoneCompletedByGroup: Record<string, number>;
  groupSize: Record<string, number>;
  reviews?: OrganizationAssessmentReview[];
  keystoneRelease?: PlatformAssessmentRelease | null;
  firstParty?: FirstPartyAssessment[];
  firstPartyReleases?: Record<string, PlatformAssessmentRelease | null>;
  firstPartyCompletedByGroup?: Record<string, Record<string, number>>;
}): AssessmentCatalogItem[] {
  const showGroupName = input.groups.length > 1;
  const items: AssessmentCatalogItem[] = [];
  const groups = input.groups.length > 0 ? input.groups : [];
  const reviews = input.reviews ?? [];

  if (groups.length === 0) {
    return input.custom.map((assessment) =>
      withDecision({
        key: assessment.id,
        assessmentKey: customAssessmentKey(assessment.id),
        kind: "custom",
        status: "available",
        section: "available",
        reviewStatus: null,
        groupId: "",
        href: `/manager/assessments/${assessment.id}`,
        questionCount: assessment.questionCount,
        assignedCount: assessment.assignedCount,
        completedCount: assessment.completedCount,
        customId: assessment.id,
        title: assessment.title,
        description: assessment.description,
      })
    );
  }

  for (const group of groups) {
    const review = reviewForGroup(reviews, group.id, KEYSTONE_ASSESSMENT_KEY);
    const status = catalogVisibility({
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      groupId: group.id,
      availability: input.availability,
      reviewStatus: review?.status ?? null,
    });
    const section = platformSection({
      assessmentKey: KEYSTONE_ASSESSMENT_KEY,
      release: input.keystoneRelease,
      reviewStatus: review?.status ?? null,
      status,
    });
    if (!section) continue;

    items.push(
      withDecision({
        key: `${group.id}:${KEYSTONE_ASSESSMENT_KEY}`,
        assessmentKey: KEYSTONE_ASSESSMENT_KEY,
        kind: "keystone",
        status,
        section,
        reviewStatus: review?.status ?? null,
        groupId: group.id,
        groupName: showGroupName ? group.name : undefined,
        href: catalogDeskHref({
          kind: "keystone",
          assessmentKey: KEYSTONE_ASSESSMENT_KEY,
          groupId: group.id,
          section,
          release: input.keystoneRelease,
        }),
        questionCount: PROFILE_QUESTION_COUNT,
        assignedCount: input.groupSize[group.id] ?? 0,
        completedCount: input.keystoneCompletedByGroup[group.id] ?? 0,
      })
    );
  }

  const firstParty = input.firstParty ?? listFirstPartyAssessments();
  for (const assessment of firstParty) {
    for (const group of groups) {
      const review = reviewForGroup(reviews, group.id, assessment.key);
      const status = catalogVisibility({
        assessmentKey: assessment.key,
        groupId: group.id,
        availability: input.availability,
        reviewStatus: review?.status ?? null,
      });
      const section = platformSection({
        assessmentKey: assessment.key,
        release: input.firstPartyReleases?.[assessment.key] ?? null,
        reviewStatus: review?.status ?? null,
        status,
      });
      if (!section) continue;

      items.push(
        withDecision({
          key: `${group.id}:${assessment.key}`,
          assessmentKey: assessment.key,
          kind: "platform",
          status,
          section,
          reviewStatus: review?.status ?? null,
          groupId: group.id,
          groupName: showGroupName ? group.name : undefined,
          href: catalogDeskHref({
            kind: "platform",
            assessmentKey: assessment.key,
            groupId: group.id,
            section,
            release: input.firstPartyReleases?.[assessment.key] ?? null,
          }),
          questionCount: assessment.questionCount,
          assignedCount: input.groupSize[group.id] ?? 0,
          completedCount: input.firstPartyCompletedByGroup?.[assessment.key]?.[group.id] ?? 0,
          title: assessment.title,
          description: assessment.description,
        })
      );
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
      items.push(
        withDecision({
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
        })
      );
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
