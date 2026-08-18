import { isAuthoredPlatformAssessmentKey } from "@/lib/admin/platform-assessments";
import {
  KEYSTONE_ASSESSMENT_KEY,
  availabilityStatus,
  type AssessmentAvailabilityRow,
  type AssessmentVisibility,
} from "@/lib/assessments/availability";

export const ASSESSMENT_REVIEW_STATUSES = ["pending", "accepted", "declined"] as const;
export type AssessmentReviewStatus = (typeof ASSESSMENT_REVIEW_STATUSES)[number];

export const ASSESSMENT_DECLINE_REASON_MAX = 400;
export const ASSESSMENT_REVERSE_ACCEPT_CONFIRM = "ACCEPT";

export type PlatformAssessmentRelease = {
  assessment_key: string;
  released_at: string | null;
  first_released_at: string | null;
  released_by: string | null;
};

export type OrganizationAssessmentReview = {
  group_id: string;
  assessment_key: string;
  status: AssessmentReviewStatus;
  decline_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

export function isAssessmentReviewStatus(value: unknown): value is AssessmentReviewStatus {
  return (
    value === "pending" || value === "accepted" || value === "declined"
  );
}

export function platformAssessmentTitle(assessmentKey: string, fallbackTitle?: string) {
  if (assessmentKey === KEYSTONE_ASSESSMENT_KEY) return "Keystone Assessment";
  if (fallbackTitle?.trim()) return fallbackTitle.trim();
  return assessmentKey;
}

export function isLegacyCatalogAssessment(release: PlatformAssessmentRelease | null | undefined) {
  return !release?.first_released_at;
}

export function isAssessmentCurrentlyReleased(
  release: PlatformAssessmentRelease | null | undefined
) {
  return Boolean(release?.released_at);
}

export function reviewForGroup(
  reviews: OrganizationAssessmentReview[],
  groupId: string,
  assessmentKey: string
) {
  return (
    reviews.find((row) => row.group_id === groupId && row.assessment_key === assessmentKey) ??
    null
  );
}

export function organizationMayOfferAssessment(input: {
  assessmentKey: string;
  release?: PlatformAssessmentRelease | null;
  reviewStatus?: AssessmentReviewStatus | null;
}) {
  if (input.assessmentKey === KEYSTONE_ASSESSMENT_KEY) {
    if (isLegacyCatalogAssessment(input.release)) return true;
    if (!isAssessmentCurrentlyReleased(input.release)) return false;
    return input.reviewStatus === "accepted";
  }
  if (isAuthoredPlatformAssessmentKey(input.assessmentKey)) {
    if (!isAssessmentCurrentlyReleased(input.release)) return false;
    return input.reviewStatus === "accepted";
  }
  return true;
}

export function catalogVisibility(input: {
  assessmentKey: string;
  groupId: string;
  availability: AssessmentAvailabilityRow[];
  reviewStatus?: AssessmentReviewStatus | null;
}): AssessmentVisibility {
  const row = input.availability.find(
    (item) => item.group_id === input.groupId && item.assessment_key === input.assessmentKey
  );
  if (row) return row.status;
  if (
    (input.assessmentKey === KEYSTONE_ASSESSMENT_KEY ||
      isAuthoredPlatformAssessmentKey(input.assessmentKey)) &&
    input.reviewStatus === "accepted"
  ) {
    return "hidden";
  }
  return availabilityStatus(input.availability, input.groupId, input.assessmentKey);
}
