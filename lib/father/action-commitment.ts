import { localDateTime, localParts, parseClock, parseTimeZone } from "@/lib/notifications/schedule";

export const INTENTION_OPTIONS = [
  "tonight",
  "this_weekend",
  "bedtime",
  "drive",
  "next_time",
  "custom",
] as const;

export type IntentionOption = (typeof INTENTION_OPTIONS)[number];

export const OUTCOME_NOTE_MAX = 140;

export const INTENTION_CLOCK: Record<Exclude<IntentionOption, "custom">, string> = {
  tonight: "20:00",
  this_weekend: "10:00",
  bedtime: "21:00",
  drive: "17:30",
  next_time: "19:00",
};

export const INTENTION_LABEL_KEYS: Record<IntentionOption, string> = {
  tonight: "father.session.intentTonight",
  this_weekend: "father.session.intentWeekend",
  bedtime: "father.session.intentBedtime",
  drive: "father.session.intentDrive",
  next_time: "father.session.intentNext",
  custom: "father.session.intentCustom",
};

export type ActionCommitment = {
  sessionId: string;
  userId: string;
  intentionLabel: IntentionOption;
  intentionAt: string | null;
  committedAt: string;
  completedAt: string | null;
  closedAt: string | null;
  outcomeNote: string | null;
};

export type ActionLoopState = "commit" | "do" | "finish" | "closed";

export function isIntentionOption(value: unknown): value is IntentionOption {
  return typeof value === "string" && (INTENTION_OPTIONS as readonly string[]).includes(value);
}

export function parseOutcomeNote(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, OUTCOME_NOTE_MAX);
}

export function actionLoopState(input: {
  actionCompleted: boolean;
  commitment: Pick<ActionCommitment, "committedAt" | "completedAt" | "closedAt"> | null;
}): ActionLoopState {
  if (input.commitment?.closedAt) return "closed";
  if (input.actionCompleted || input.commitment?.completedAt) {
    return input.commitment ? "finish" : "closed";
  }
  if (input.commitment?.committedAt) return "do";
  return "commit";
}

export function shouldQueueActionReminder(state: ActionLoopState) {
  return state === "do";
}

export function isOpenActionCommitment(row: {
  completedAt?: string | null;
  closedAt?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
}) {
  return !row.completedAt && !row.closedAt && !row.completed_at && !row.closed_at;
}

export function customMomentParts(intentionAt: string, timeZone: string) {
  const at = new Date(intentionAt);
  if (Number.isNaN(at.getTime())) return null;
  const parts = localParts(at, timeZone);
  return {
    date: parts.dateKey,
    time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
  };
}

export function formatNamedMoment(input: {
  label: IntentionOption;
  intentionAt: string | null;
  timeZone: string;
  locale: string;
  optionLabel: string;
}) {
  if (input.label !== "custom" || !input.intentionAt) return input.optionLabel;
  const at = new Date(input.intentionAt);
  if (Number.isNaN(at.getTime())) return input.optionLabel;
  const zone = parseTimeZone(input.timeZone) ?? "UTC";
  return new Intl.DateTimeFormat(input.locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  }).format(at);
}

function clockParts(clock: string) {
  const parsed = parseClock(clock);
  if (!parsed) return null;
  const [hour, minute] = parsed.split(":").map((part) => Number.parseInt(part, 10));
  return { hour, minute };
}

function atLocalClock(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  clock: string
) {
  const parts = clockParts(clock);
  if (!parts) return null;
  return localDateTime(timeZone, year, month, day, parts.hour, parts.minute);
}

function addLocalCalendarDays(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  days: number
) {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function firstFutureClock(input: {
  at: Date;
  timeZone: string;
  clock: string;
  daysAhead?: number;
}) {
  const local = localParts(input.at, input.timeZone);
  const start = addLocalCalendarDays(
    input.timeZone,
    local.year,
    local.month,
    local.day,
    input.daysAhead ?? 0
  );
  for (let offset = 0; offset < 8; offset += 1) {
    const next = addLocalCalendarDays(input.timeZone, start.year, start.month, start.day, offset);
    const resolved = atLocalClock(input.timeZone, next.year, next.month, next.day, input.clock);
    if (resolved && resolved.getTime() > input.at.getTime()) return resolved;
  }
  return null;
}

function nextWeekdayClock(input: {
  at: Date;
  timeZone: string;
  weekday: number;
  clock: string;
}) {
  const local = localParts(input.at, input.timeZone);
  const daysAhead = (input.weekday - local.weekday + 7) % 7;
  const start = addLocalCalendarDays(input.timeZone, local.year, local.month, local.day, daysAhead);
  const sameDay = atLocalClock(input.timeZone, start.year, start.month, start.day, input.clock);
  if (sameDay && sameDay.getTime() > input.at.getTime()) return sameDay;
  const next = addLocalCalendarDays(input.timeZone, start.year, start.month, start.day, 7);
  return atLocalClock(input.timeZone, next.year, next.month, next.day, input.clock);
}

export function resolveIntentionAt(input: {
  option: IntentionOption;
  at?: Date;
  timeZone: string;
  customDate?: string | null;
  customTime?: string | null;
}) {
  const timeZone = parseTimeZone(input.timeZone) ?? "UTC";
  const at = input.at ?? new Date();

  if (input.option === "custom") {
    const date = String(input.customDate ?? "").trim();
    const time = parseClock(input.customTime);
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match || !time) return null;
    const resolved = atLocalClock(
      timeZone,
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10),
      Number.parseInt(match[3], 10),
      time
    );
    if (!resolved || resolved.getTime() <= at.getTime()) return null;
    return resolved;
  }

  if (input.option === "this_weekend") {
    return nextWeekdayClock({
      at,
      timeZone,
      weekday: 6,
      clock: INTENTION_CLOCK.this_weekend,
    });
  }

  if (input.option === "next_time") {
    return firstFutureClock({
      at,
      timeZone,
      clock: INTENTION_CLOCK.next_time,
      daysAhead: 1,
    });
  }

  return firstFutureClock({
    at,
    timeZone,
    clock: INTENTION_CLOCK[input.option],
  });
}

export function actionSkillText(
  session: { keyline?: string | null; title?: string | null },
  fallback = ""
) {
  const keyline = typeof session.keyline === "string" ? session.keyline.replace(/\s+/g, " ").trim() : "";
  if (keyline) return keyline;
  const title = typeof session.title === "string" ? session.title.replace(/\s+/g, " ").trim() : "";
  return title || fallback;
}

export function asActionCommitment(row: unknown): ActionCommitment | null {
  const source = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  if (!isIntentionOption(source.intention_label)) return null;
  if (typeof source.session_id !== "string" || typeof source.user_id !== "string") return null;
  if (typeof source.committed_at !== "string") return null;
  return {
    sessionId: source.session_id,
    userId: source.user_id,
    intentionLabel: source.intention_label,
    intentionAt: typeof source.intention_at === "string" ? source.intention_at : null,
    committedAt: source.committed_at,
    completedAt: typeof source.completed_at === "string" ? source.completed_at : null,
    closedAt: typeof source.closed_at === "string" ? source.closed_at : null,
    outcomeNote: typeof source.outcome_note === "string" ? parseOutcomeNote(source.outcome_note) : null,
  };
}
