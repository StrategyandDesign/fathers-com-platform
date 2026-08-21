export const STAFF_MESSAGE_MAX = 280;

export const STAFF_MESSAGE_AUDIENCES = [
  "all_leaders",
  "selected_leaders",
  "all_reviewers",
  "selected_reviewers",
  "all_leaders_and_reviewers",
] as const;

export type StaffMessageAudience = (typeof STAFF_MESSAGE_AUDIENCES)[number];
export type StaffMessageRole = "manager" | "reviewer";

export type StaffMessagePerson = {
  id: string;
  name: string;
  email: string | null;
  role: StaffMessageRole;
  organization: string | null;
};

export type StaffRibbonMessage = {
  id: string;
  body: string;
  createdAt: string;
};

export type AdminStaffMessageRow = {
  id: string;
  body: string;
  audience: StaffMessageAudience;
  createdAt: string;
  recipientCount: number;
  dismissedCount: number;
};

export function isStaffMessageAudience(value: string): value is StaffMessageAudience {
  return (STAFF_MESSAGE_AUDIENCES as readonly string[]).includes(value);
}

export function isStaffMessageRole(value: string): value is StaffMessageRole {
  return value === "manager" || value === "reviewer";
}

export function normalizeStaffMessage(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export function staffMessageAudienceNeedsPicks(audience: StaffMessageAudience) {
  return audience === "selected_leaders" || audience === "selected_reviewers";
}

export function filterStaffMessageRecipients(
  people: StaffMessagePerson[],
  audience: StaffMessageAudience,
  selectedIds: string[]
) {
  const picked = new Set(selectedIds);
  return people.filter((person) => {
    if (audience === "all_leaders_and_reviewers") return true;
    if (audience === "all_leaders") return person.role === "manager";
    if (audience === "all_reviewers") return person.role === "reviewer";
    if (audience === "selected_leaders") {
      return person.role === "manager" && picked.has(person.id);
    }
    return person.role === "reviewer" && picked.has(person.id);
  });
}
