import { isFirstPartyAssessmentKey } from "@/lib/assessments/first-party";

export const KEYSTONE_ASSESSMENT_KEY = "keystone";

export const ASSESSMENT_VISIBILITY = ["available", "hidden"] as const;
export type AssessmentVisibility = (typeof ASSESSMENT_VISIBILITY)[number];

export type AssessmentAvailabilityRow = {
  group_id: string;
  assessment_key: string;
  status: AssessmentVisibility;
  decided_at?: string | null;
  decided_by?: string | null;
};

export function isAssessmentVisibility(value: unknown): value is AssessmentVisibility {
  return value === "available" || value === "hidden";
}

export function customAssessmentKey(assessmentId: string) {
  return assessmentId;
}

export function asAvailabilityRow(row: {
  group_id: string;
  assessment_key: string;
  status: string;
  decided_at?: string | null;
  decided_by?: string | null;
}): AssessmentAvailabilityRow | null {
  if (!isAssessmentVisibility(row.status)) return null;
  return {
    group_id: row.group_id,
    assessment_key: row.assessment_key,
    status: row.status,
    decided_at: row.decided_at,
    decided_by: row.decided_by,
  };
}

export function availabilityStatus(
  rows: AssessmentAvailabilityRow[],
  groupId: string,
  assessmentKey: string
): AssessmentVisibility {
  const row = rows.find(
    (item) => item.group_id === groupId && item.assessment_key === assessmentKey
  );
  return row?.status ?? "available";
}

export function isAssessmentAvailable(
  rows: AssessmentAvailabilityRow[],
  groupId: string,
  assessmentKey: string
) {
  return availabilityStatus(rows, groupId, assessmentKey) === "available";
}

export function primaryFatherGroupId(
  groupIds: string[],
  homeGroupId?: string | null
) {
  if (homeGroupId && groupIds.includes(homeGroupId)) return homeGroupId;
  return groupIds[0] ?? null;
}

export function fatherCanStartAssessment(input: {
  rows: AssessmentAvailabilityRow[];
  groupIds: string[];
  homeGroupId?: string | null;
  assessmentKey: string;
  hasProgress?: boolean;
  release?: {
    released_at?: string | null;
    first_released_at?: string | null;
  } | null;
  reviewStatus?: "pending" | "accepted" | "declined" | null;
}) {
  if (input.hasProgress) return true;
  const groupId = primaryFatherGroupId(input.groupIds, input.homeGroupId);

  if (isFirstPartyAssessmentKey(input.assessmentKey)) {
    if (!groupId) return false;
    const currentlyReleased = Boolean(input.release?.released_at);
    if (!currentlyReleased || input.reviewStatus !== "accepted") return false;
    const row = input.rows.find(
      (item) => item.group_id === groupId && item.assessment_key === input.assessmentKey
    );
    return row?.status === "available";
  }

  if (!groupId) return true;

  if (input.assessmentKey === KEYSTONE_ASSESSMENT_KEY) {
    const firstReleased = Boolean(input.release?.first_released_at);
    const currentlyReleased = Boolean(input.release?.released_at);
    if (firstReleased) {
      if (!currentlyReleased || input.reviewStatus !== "accepted") return false;
      const row = input.rows.find(
        (item) => item.group_id === groupId && item.assessment_key === input.assessmentKey
      );
      return row?.status === "available";
    }
    if (input.reviewStatus === "declined" || input.reviewStatus === "pending") {
      return false;
    }
  }

  return isAssessmentAvailable(input.rows, groupId, input.assessmentKey);
}

export function leaderCanStartAssessment(input: {
  rows: AssessmentAvailabilityRow[];
  groupIds: string[];
  assessmentKey: string;
  hasProgress?: boolean;
  release?: {
    released_at?: string | null;
    first_released_at?: string | null;
  } | null;
  reviewStatusForGroup: (groupId: string) => "pending" | "accepted" | "declined" | null;
}) {
  if (input.hasProgress) return true;
  if (input.groupIds.length === 0) {
    return fatherCanStartAssessment({
      rows: input.rows,
      groupIds: [],
      assessmentKey: input.assessmentKey,
      release: input.release,
      reviewStatus: null,
    });
  }
  return input.groupIds.some((groupId) =>
    fatherCanStartAssessment({
      rows: input.rows,
      groupIds: [groupId],
      homeGroupId: groupId,
      assessmentKey: input.assessmentKey,
      release: input.release,
      reviewStatus: input.reviewStatusForGroup(groupId),
    })
  );
}
