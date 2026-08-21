export const ORGANIZATION_STAFF_ROLES = ["manager", "reviewer"] as const;
export type OrganizationStaffRole = (typeof ORGANIZATION_STAFF_ROLES)[number];

export const ORGANIZATION_ACTIVITY_KINDS = [
  "staff_added",
  "staff_removed",
  "note_posted",
  "note_cleared",
  "training_assigned",
  "review_accepted",
  "review_declined",
  "certificate_issued",
  "participation_set",
  "nudge_sent",
] as const;
export type OrganizationActivityKind = (typeof ORGANIZATION_ACTIVITY_KINDS)[number];

export type OrganizationStaffMember = {
  groupId: string;
  profileId: string;
  staffRole: OrganizationStaffRole;
  name: string;
  addedAt: string;
  listedOwner: boolean;
};

export type OrganizationActivityRow = {
  id: string;
  groupId: string;
  groupName: string;
  actorId: string;
  actorName: string;
  kind: OrganizationActivityKind | string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function isOrganizationStaffRole(value: unknown): value is OrganizationStaffRole {
  return (
    typeof value === "string" &&
    (ORGANIZATION_STAFF_ROLES as readonly string[]).includes(value)
  );
}

export function isOrganizationActivityKind(value: unknown): value is OrganizationActivityKind {
  return (
    typeof value === "string" &&
    (ORGANIZATION_ACTIVITY_KINDS as readonly string[]).includes(value)
  );
}

export function canRemoveStaff(input: {
  targetId: string;
  targetRole: OrganizationStaffRole;
  managerCount: number;
}) {
  if (input.targetRole !== "manager") return true;
  return input.managerCount > 1;
}

export function staffRoleMatchesProfile(
  staffRole: OrganizationStaffRole,
  profileRole: string | null | undefined
) {
  return profileRole === staffRole;
}

export function listedOwnerName(staff: OrganizationStaffMember[]) {
  return staff.find((row) => row.listedOwner && row.staffRole === "manager") ?? null;
}

export function managerNames(staff: OrganizationStaffMember[]) {
  return staff
    .filter((row) => row.staffRole === "manager")
    .map((row) => row.name)
    .filter(Boolean);
}

export function formatLeaderNames(names: string[]) {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

export function activityCopyKey(kind: string) {
  switch (kind) {
    case "staff_added":
      return "manager.dashboard.activityStaffAdded";
    case "staff_removed":
      return "manager.dashboard.activityStaffRemoved";
    case "note_posted":
      return "manager.dashboard.activityNotePosted";
    case "note_cleared":
      return "manager.dashboard.activityNoteCleared";
    case "training_assigned":
      return "manager.dashboard.activityTrainingAssigned";
    case "review_accepted":
      return "manager.dashboard.activityReviewAccepted";
    case "review_declined":
      return "manager.dashboard.activityReviewDeclined";
    case "certificate_issued":
      return "manager.dashboard.activityCertificateIssued";
    case "participation_set":
      return "manager.dashboard.activityParticipationSet";
    case "nudge_sent":
      return "manager.dashboard.activityNudgeSent";
    default:
      return "manager.dashboard.activityUnknown";
  }
}

export function visibleCohortNotes<T extends { updatedAt: string; dismissedAt?: string | null }>(
  notes: T[],
  isVisible: (updatedAt: string, dismissedAt: string | null | undefined) => boolean
) {
  return [...notes]
    .filter((note) => isVisible(note.updatedAt, note.dismissedAt))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
