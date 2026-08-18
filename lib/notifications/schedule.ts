import {
  DEFAULT_QUIET_END,
  DEFAULT_QUIET_START,
  FREQUENCY_CEILING,
  WEEKLY_CATCHUP_MS,
  type NotificationType,
  type ReminderCandidate,
} from "@/lib/notifications/types";

export { FREQUENCY_CEILING, FREQUENCY_WINDOW_DAYS } from "@/lib/notifications/types";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parseClock(value: unknown) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  if (!Number.isInteger(hours) || hours > 23) return null;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function clockToMinutes(value: string) {
  const parsed = parseClock(value);
  if (!parsed) return null;
  const [hours, minutes] = parsed.split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

export function parseTimeZone(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > 80) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
    return raw;
  } catch {
    return null;
  }
}

export function localParts(at: Date, timeZone: string) {
  const zone = parseTimeZone(timeZone) ?? "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = WEEKDAY_INDEX[read("weekday")] ?? 0;
  const year = Number.parseInt(read("year"), 10);
  const month = Number.parseInt(read("month"), 10);
  const day = Number.parseInt(read("day"), 10);
  const hour = Number.parseInt(read("hour"), 10);
  const minute = Number.parseInt(read("minute"), 10);
  return {
    weekday,
    year,
    month,
    day,
    hour,
    minute,
    minutes: hour * 60 + minute,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export function isoWeekKey(at: Date, timeZone: string) {
  const local = localParts(at, timeZone);
  const utc = Date.UTC(local.year, local.month - 1, local.day);
  const date = new Date(utc);
  const shift = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - shift + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      (date.getTime() - firstThursday.getTime()) / 604_800_000
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isInQuietHours(
  at: Date,
  timeZone: string,
  start = DEFAULT_QUIET_START,
  end = DEFAULT_QUIET_END
) {
  const startMinutes = clockToMinutes(start);
  const endMinutes = clockToMinutes(end);
  if (startMinutes == null || endMinutes == null) return false;
  if (startMinutes === endMinutes) return false;
  const { minutes } = localParts(at, timeZone);
  if (startMinutes < endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }
  return minutes >= startMinutes || minutes < endMinutes;
}

export function lastWeeklyOccurrence(input: {
  at: Date;
  timeZone: string;
  weekday: number;
  remindAt: string;
}) {
  const due = clockToMinutes(input.remindAt);
  if (due == null) return null;
  const local = localParts(input.at, input.timeZone);
  let daysBack = (local.weekday - input.weekday + 7) % 7;
  if (daysBack === 0 && local.minutes < due) daysBack = 7;
  const approx = new Date(input.at.getTime() - daysBack * 86_400_000);
  return applyClock(approx, input.timeZone, input.remindAt);
}

export function weeklySlotKey(input: {
  at: Date;
  timeZone: string;
  weekday: number;
  remindAt: string;
}) {
  const scheduled = lastWeeklyOccurrence(input);
  return scheduled ? localParts(scheduled, input.timeZone).dateKey : null;
}

export function isWeeklyDue(input: {
  at: Date;
  timeZone: string;
  weekday: number;
  remindAt: string;
  maxAgeMs?: number;
}) {
  const scheduled = lastWeeklyOccurrence(input);
  if (!scheduled) return false;
  const age = input.at.getTime() - scheduled.getTime();
  if (age < 0) return false;
  return age <= (input.maxAgeMs ?? WEEKLY_CATCHUP_MS);
}

export function applyClock(at: Date, timeZone: string, clock: string) {
  const minutes = clockToMinutes(clock);
  if (minutes == null) return at;
  const local = localParts(at, timeZone);
  const current = local.minutes;
  const delta = (minutes - current) * 60_000;
  return new Date(at.getTime() + delta);
}

export function localDateTime(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  let date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let i = 0; i < 4; i += 1) {
    const parts = localParts(date, timeZone);
    const target = Date.UTC(year, month - 1, day, hour, minute);
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const delta = target - actual;
    if (delta === 0) break;
    date = new Date(date.getTime() + delta);
  }
  return date;
}

export function addLocalDays(at: Date, days: number) {
  return new Date(at.getTime() + days * 86_400_000);
}

export function nextQuietEnd(at: Date, timeZone: string, quietEnd = DEFAULT_QUIET_END) {
  const parsed = parseClock(quietEnd) ?? DEFAULT_QUIET_END;
  const [hour, minute] = parsed.split(":").map((part) => Number.parseInt(part, 10));
  const local = localParts(at, timeZone);
  const candidate = localDateTime(timeZone, local.year, local.month, local.day, hour, minute);
  if (candidate.getTime() > at.getTime()) return candidate;
  const next = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  return localDateTime(
    timeZone,
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    hour,
    minute
  );
}

export function pickWithinCeiling<T extends { type: NotificationType }>(
  events: T[],
  sentInWindow: number,
  limit = FREQUENCY_CEILING
) {
  const remaining = Math.max(0, limit - sentInWindow);
  const ranked = [...events].sort((left, right) => {
    const leftBoost = left.type === "leader_encouragement" ? 0 : 1;
    const rightBoost = right.type === "leader_encouragement" ? 0 : 1;
    return leftBoost - rightBoost;
  });
  if (remaining === 0) {
    const encouragement = ranked.find((event) => event.type === "leader_encouragement");
    return encouragement ? [encouragement] : [];
  }
  return ranked.slice(0, remaining);
}

export function weeklyDedupeKey(userId: string, sessionId: string, weekKey: string) {
  return `weekly:${userId}:${sessionId}:${weekKey}`;
}

export function actionDedupeKey(userId: string, sessionId: string) {
  return `action:${userId}:${sessionId}`;
}

export function assignmentDedupeKey(userId: string, trainingId: string) {
  return `assignment:${userId}:${trainingId}`;
}

export function certificateDedupeKey(userId: string, certificateId: string) {
  return `certificate:${userId}:${certificateId}`;
}

export function encouragementDedupeKey(userId: string, nudgeId: string) {
  return `encouragement:${userId}:${nudgeId}`;
}

export function rankCandidates(candidates: ReminderCandidate[]) {
  return pickWithinCeiling(candidates, 0, candidates.length);
}
