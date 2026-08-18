import type { AppRole } from "@/lib/auth/roles";

export const SUPPORT_SUBMITTER_ROLES = ["father", "manager", "reviewer"] as const;
export type SupportSubmitterRole = (typeof SUPPORT_SUBMITTER_ROLES)[number];

export const SUPPORT_CATEGORIES = ["bug", "not_working", "question", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["new", "looking", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_FILTERS = ["new", "resolved"] as const;
export type SupportFilter = (typeof SUPPORT_FILTERS)[number];

export const SUPPORT_CATEGORY_LABEL: Record<SupportCategory, string> = {
  bug: "Bug",
  not_working: "Something not working",
  question: "Question",
  other: "Other",
};

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  new: "New",
  looking: "Looking into it",
  resolved: "Resolved",
};

export const SUPPORT_ROLE_LABEL: Record<SupportSubmitterRole, string> = {
  father: "Father",
  manager: "Leader",
  reviewer: "Reviewer",
};

export const SUPPORT_HOME_LABEL: Record<SupportSubmitterRole, string> = {
  father: "Home",
  manager: "Dashboard",
  reviewer: "Insights",
};

export const MESSAGE_MAX_LENGTH = 2000;
export const PAGE_MAX_LENGTH = 200;
export const PREVIEW_MAX_LENGTH = 80;

export const SEND_FAILED_MESSAGE = "Unable to send right now. Please try again.";
export const RECEIVED_NOTICE = "Report received.";

export type SupportReportRow = {
  id: string;
  submitterId: string;
  submitterRole: SupportSubmitterRole;
  category: SupportCategory;
  page: string | null;
  message: string;
  screenshotPath: string | null;
  status: SupportStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export function isSupportSubmitterRole(value: unknown): value is SupportSubmitterRole {
  return (
    typeof value === "string" &&
    SUPPORT_SUBMITTER_ROLES.includes(value as SupportSubmitterRole)
  );
}

export function isSupportCategory(value: unknown): value is SupportCategory {
  return typeof value === "string" && SUPPORT_CATEGORIES.includes(value as SupportCategory);
}

export function isSupportStatus(value: unknown): value is SupportStatus {
  return typeof value === "string" && SUPPORT_STATUSES.includes(value as SupportStatus);
}

export function parseSupportFilter(value: unknown): SupportFilter {
  return value === "resolved" ? "resolved" : "new";
}

export function supportHelpPath(role: AppRole): string | null {
  if (!isSupportSubmitterRole(role)) return null;
  return `/${role}/help`;
}

export function messagePreview(message: string, max = PREVIEW_MAX_LENGTH) {
  const text = message.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function formatSupportDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function supportStatusClassName(status: SupportStatus) {
  if (status === "new") return "text-primary";
  if (status === "looking") return "text-foreground";
  return "text-muted-foreground";
}
