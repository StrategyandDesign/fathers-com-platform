export const TRAINING_REQUEST_STATUSES = [
  "new",
  "considering",
  "planned",
  "declined",
] as const;
export type TrainingRequestStatus = (typeof TRAINING_REQUEST_STATUSES)[number];

export const TRAINING_REQUEST_FILTERS = ["new", "closed"] as const;
export type TrainingRequestFilter = (typeof TRAINING_REQUEST_FILTERS)[number];

export const TRAINING_REQUEST_STATUS_LABEL: Record<TrainingRequestStatus, string> = {
  new: "New",
  considering: "Under consideration",
  planned: "Planned",
  declined: "Declined",
};

export const TOPIC_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const AUDIENCE_MAX_LENGTH = 200;
export const PREVIEW_MAX_LENGTH = 80;

export const SEND_FAILED_MESSAGE = "Unable to send request. Please try again.";
export const RECEIVED_NOTICE = "Thanks — your request has been received";

export type TrainingRequestRow = {
  id: string;
  managerId: string;
  groupId: string | null;
  organizationName: string | null;
  topic: string;
  description: string;
  audience: string | null;
  status: TrainingRequestStatus;
  createdAt: string;
  decidedAt: string | null;
};

export function isTrainingRequestStatus(value: unknown): value is TrainingRequestStatus {
  return (
    typeof value === "string" &&
    TRAINING_REQUEST_STATUSES.includes(value as TrainingRequestStatus)
  );
}

export function parseTrainingRequestFilter(value: unknown): TrainingRequestFilter {
  return value === "closed" ? "closed" : "new";
}

export function requestPreview(text: string, max = PREVIEW_MAX_LENGTH) {
  const value = text.replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function formatRequestDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function trainingRequestStatusClassName(status: TrainingRequestStatus) {
  if (status === "new") return "text-primary";
  if (status === "considering") return "text-foreground";
  return "text-muted-foreground";
}
