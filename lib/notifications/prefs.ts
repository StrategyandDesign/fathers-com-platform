import { isPublicLocale } from "@/lib/i18n/config";
import { parseClock, parseTimeZone } from "@/lib/notifications/schedule";
import {
  DEFAULT_QUIET_END,
  DEFAULT_QUIET_START,
  type NotificationLocale,
  type NotificationPrefsRow,
} from "@/lib/notifications/types";
import { parseWeekday } from "@/lib/father/onboarding";

function asBool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function parseNotificationPrefsRow(
  row: unknown,
  reminder?: { weekday?: number | null; remindAt?: string | null } | null
): NotificationPrefsRow {
  const source = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const reminderDay =
    parseWeekday(source.reminder_day) ?? parseWeekday(reminder?.weekday) ?? null;
  const reminderTime =
    parseClock(source.reminder_time) ?? parseClock(reminder?.remindAt) ?? null;
  const locale: NotificationLocale = isPublicLocale(source.locale) ? source.locale : "en";

  return {
    userId: typeof source.user_id === "string" ? source.user_id : "",
    sessionReminders: asBool(source.session_reminders, true),
    actionReminders: asBool(source.action_reminders, true),
    newTrainings: asBool(source.new_trainings, true),
    certificateSent: asBool(source.certificate_sent, true),
    leaderEncouragement: asBool(source.leader_encouragement, true),
    pushEnabled: asBool(source.push_enabled, true),
    emailEnabled: asBool(source.email_enabled, true),
    reminderDay,
    reminderTime,
    timezone: parseTimeZone(source.timezone) ?? "UTC",
    quietHoursStart: parseClock(source.quiet_hours_start) ?? DEFAULT_QUIET_START,
    quietHoursEnd: parseClock(source.quiet_hours_end) ?? DEFAULT_QUIET_END,
    locale,
  };
}

export function scheduleFromPrefs(prefs: NotificationPrefsRow) {
  return {
    reminderDay: prefs.reminderDay,
    reminderTime: prefs.reminderTime,
    timezone: prefs.timezone,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
  };
}
