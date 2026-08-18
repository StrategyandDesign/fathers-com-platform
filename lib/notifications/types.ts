export const NOTIFICATION_TYPES = [
  "weekly_session",
  "action",
  "new_assignment",
  "certificate",
  "leader_encouragement",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["push", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const DELIVERY_STATUSES = [
  "sent",
  "skipped_pref",
  "skipped_quiet",
  "skipped_ceiling",
  "skipped_channel",
  "failed",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DEFAULT_QUIET_START = "21:00";
export const DEFAULT_QUIET_END = "07:00";
export const FREQUENCY_WINDOW_DAYS = 7;
export const FREQUENCY_CEILING = 3;
export const ACTION_REMINDER_DELAY_DAYS = 2;
export const WEEKLY_CATCHUP_MS = 36 * 60 * 60 * 1000;

export type NotificationLocale = "en" | "he";

export type NotificationCopy = {
  title: string;
  body: string;
};

export type NudgeTier = "A" | "B" | "C";

export type NotificationPayload = {
  trainingTitle?: string;
  minutes?: number | null;
  sessionCount?: number | null;
  completedCount?: number | null;
  nudgeTier?: NudgeTier;
  leaderName?: string;
  actionSummary?: string;
  sessionId?: string;
  trainingId?: string;
  certificateId?: string;
  cohortNote?: boolean;
};

export type ReminderCandidate = {
  userId: string;
  type: NotificationType;
  dedupeKey: string;
  href: string;
  payload: NotificationPayload;
  availableAt: string;
};

export type NotificationPrefsRow = {
  userId: string;
  sessionReminders: boolean;
  actionReminders: boolean;
  newTrainings: boolean;
  certificateSent: boolean;
  leaderEncouragement: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  reminderDay: number | null;
  reminderTime: string | null;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  locale: NotificationLocale;
};

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export function prefEnabled(prefs: NotificationPrefsRow, type: NotificationType) {
  if (type === "weekly_session") return prefs.sessionReminders;
  if (type === "action") return prefs.actionReminders;
  if (type === "new_assignment") return prefs.newTrainings;
  if (type === "certificate") return prefs.certificateSent;
  return prefs.leaderEncouragement;
}
