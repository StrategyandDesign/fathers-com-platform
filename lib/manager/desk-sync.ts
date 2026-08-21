/** Browser-safe helpers. Keep cookies and Supabase out of this file. */
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

export function countLatestStamp(count: number, latest?: string | null) {
  return `${count}:${latest ?? ""}`;
}

export function deskSyncVersion(input: {
  reviews?: DeskSyncReview[];
  notes?: DeskSyncNote[];
  activityId?: string | null;
  activityAt?: string | null;
  assignmentCount?: number;
  assignmentAt?: string | null;
  certificateCount?: number;
  certificateAt?: string | null;
  progressCount?: number;
  progressAt?: string | null;
  photoCount?: number;
  photoAt?: string | null;
  assessmentReviews?: DeskSyncReview[];
  assessmentAvailability?: DeskSyncReview[];
  assessmentAssignmentCount?: number;
  assessmentAssignmentAt?: string | null;
  customAssessmentCount?: number;
  customAssessmentAt?: string | null;
  participantNoteCount?: number;
  participantNoteAt?: string | null;
  nudgeCount?: number;
  nudgeAt?: string | null;
  staffCount?: number;
  staffAt?: string | null;
  memberCount?: number;
  memberAt?: string | null;
  participation?: string | null;
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
    countLatestStamp(input.assignmentCount ?? 0, input.assignmentAt),
    countLatestStamp(input.certificateCount ?? 0, input.certificateAt),
    countLatestStamp(input.progressCount ?? 0, input.progressAt),
    countLatestStamp(input.photoCount ?? 0, input.photoAt),
    reviewDecisionStamp(input.assessmentReviews ?? []) || "none",
    reviewDecisionStamp(input.assessmentAvailability ?? []) || "none",
    countLatestStamp(input.assessmentAssignmentCount ?? 0, input.assessmentAssignmentAt),
    countLatestStamp(input.customAssessmentCount ?? 0, input.customAssessmentAt),
    countLatestStamp(input.participantNoteCount ?? 0, input.participantNoteAt),
    countLatestStamp(input.nudgeCount ?? 0, input.nudgeAt),
    countLatestStamp(input.staffCount ?? 0, input.staffAt),
    countLatestStamp(input.memberCount ?? 0, input.memberAt),
    input.participation ?? "",
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
