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
};

export type NotificationToggle = {
  key: NotificationPrefKey;
  label: string;
  hint: string;
};

const MANAGER_TOGGLES: NotificationToggle[] = [
  {
    key: "participant_joined",
    label: "New participant joins the group",
    hint: "When a father uses your invite code.",
  },
  {
    key: "session_completed",
    label: "Participant completes a session",
    hint: "Film, check-in, and action are done.",
  },
  {
    key: "training_completed",
    label: "Participant completes a training",
    hint: "Every session in a training is done.",
  },
  {
    key: "profile_completed",
    label: "Participant completes a profile",
    hint: "Father Profile results are in.",
  },
  {
    key: "certificate_sent",
    label: "Certificate sent",
    hint: "When you issue a completion certificate.",
  },
  {
    key: "weekly_report_ready",
    label: "Weekly report ready",
    hint: "Saved for when weekly email reports ship.",
  },
  {
    key: "account_security_alerts",
    label: "Account and security alerts",
    hint: "Sign-in and account changes.",
  },
];

const FATHER_TOGGLES: NotificationToggle[] = [
  {
    key: "session_reminders",
    label: "Session reminders",
    hint: "When a session is waiting on him.",
  },
  {
    key: "new_trainings",
    label: "New trainings assigned",
    hint: "When a manager assigns a training.",
  },
  {
    key: "certificate_sent",
    label: "Certificate issued",
    hint: "When a completion certificate is ready to download.",
  },
  {
    key: "account_security_alerts",
    label: "Account and security alerts",
    hint: "Sign-in and account changes.",
  },
];

const REVIEWER_TOGGLES: NotificationToggle[] = [
  {
    key: "account_security_alerts",
    label: "Account and security alerts",
    hint: "Sign-in and account changes.",
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
