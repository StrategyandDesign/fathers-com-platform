import type { AppRole } from "@/lib/auth/roles";

export const NOTIFICATION_PREF_KEYS = [
  "participant_joined",
  "session_completed",
  "training_completed",
  "profile_completed",
  "certificate_sent",
  "weekly_report_ready",
  "account_security_alerts",
  "session_reminders",
  "new_trainings",
  "training_releases",
] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];

export type NotificationPreferences = Record<NotificationPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  participant_joined: true,
  session_completed: true,
  training_completed: true,
  profile_completed: true,
  certificate_sent: true,
  weekly_report_ready: true,
  account_security_alerts: true,
  session_reminders: true,
  new_trainings: true,
  training_releases: true,
};

export type NotificationToggle = {
  key: NotificationPrefKey;
  labelKey: string;
  hintKey: string;
};

const MANAGER_TOGGLES: NotificationToggle[] = [
  {
    key: "training_releases",
    labelKey: "notify.trainingReleases",
    hintKey: "notify.trainingReleasesHint",
  },
  {
    key: "certificate_sent",
    labelKey: "notify.certificateSent",
    hintKey: "notify.certificateSentHint",
  },
  {
    key: "account_security_alerts",
    labelKey: "notify.security",
    hintKey: "notify.securityHint",
  },
];

const FATHER_TOGGLES: NotificationToggle[] = [
  {
    key: "session_reminders",
    labelKey: "notify.sessionReminders",
    hintKey: "notify.sessionRemindersHint",
  },
  {
    key: "new_trainings",
    labelKey: "notify.newTrainings",
    hintKey: "notify.newTrainingsHint",
  },
  {
    key: "certificate_sent",
    labelKey: "notify.certificateIssued",
    hintKey: "notify.certificateIssuedHint",
  },
  {
    key: "account_security_alerts",
    labelKey: "notify.security",
    hintKey: "notify.securityHint",
  },
];

const REVIEWER_TOGGLES: NotificationToggle[] = [
  {
    key: "account_security_alerts",
    labelKey: "notify.security",
    hintKey: "notify.securityHint",
  },
];

export function togglesForRole(role: AppRole): NotificationToggle[] {
  if (role === "manager") return MANAGER_TOGGLES;
  if (role === "father") return FATHER_TOGGLES;
  if (role === "admin") return REVIEWER_TOGGLES;
  return REVIEWER_TOGGLES;
}

export function parseNotificationPreferences(row: unknown): NotificationPreferences {
  const source = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const key of NOTIFICATION_PREF_KEYS) {
    if (typeof source[key] === "boolean") {
      prefs[key] = source[key];
    }
  }
  return prefs;
}
