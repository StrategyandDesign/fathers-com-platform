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
}) {
  if (input.hasProgress) return true;
  const groupId = primaryFatherGroupId(input.groupIds, input.homeGroupId);
  if (!groupId) return true;
  return isAssessmentAvailable(input.rows, groupId, input.assessmentKey);
}
