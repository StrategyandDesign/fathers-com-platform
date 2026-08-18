import { localDateTime, localParts, parseTimeZone } from "@/lib/notifications/schedule";

export const MAX_FREEZES = 2;
export const FREEZE_REPLENISH_DAYS = 30;
export const STREAK_GRID_WEEKS = 12;

export type LedgerOutcome = "counted" | "frozen" | "missed" | "neutral";

export type StreakNoticeKind = "freeze_consumed" | "reset" | "freeze_replenished";

export type FatherStreakNotice = {
  id: string;
  kind: StreakNoticeKind;
  weekStart: string | null;
  payload: {
    freezesRemaining?: number;
    sessions?: number;
    certificates?: number;
  };
  createdAt: string;
};

export type FatherStreak = {
  weeks: number;
  weekKeys: string[];
};

export type EvaluateClosedWeekInput = {
  alreadyRecorded: LedgerOutcome | null;
  completedInWeek: boolean;
  hadAssignedOpenSession: boolean;
  freezesRemaining: number;
  timezoneChanged?: boolean;
};

export type EvaluateClosedWeekResult =
  | { kind: "noop"; outcome: LedgerOutcome }
  | { kind: "counted" }
  | { kind: "neutral" }
  | { kind: "frozen"; freezesRemaining: number }
  | { kind: "missed" };

export type StreakTrainingFact = {
  id: string;
  seriesId: string | null;
  partNumber: number | null;
};

export type StreakAssignmentFact = {
  trainingId: string;
  assignedAt: Date;
};

export type StreakSessionFact = {
  sessionId: string;
  trainingId: string;
  catalogIndex: number;
  completedAt: Date | null;
  flagsComplete: boolean;
};

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function resolveStreakTimeZone(value?: string | null) {
  return parseTimeZone(value) ?? "UTC";
}

export function shiftWeekKey(weekKey: string, days: number) {
  const match = weekKey.match(DATE_KEY);
  if (!match) return weekKey;
  const start = new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10) + days
    )
  );
  return formatDateKey(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate());
}

export function previousWeekStart(weekStart: string) {
  return shiftWeekKey(weekStart, -7);
}

export function nextWeekStart(weekStart: string) {
  return shiftWeekKey(weekStart, 7);
}

export function mondayWeekStart(at: Date, timeZone?: string | null) {
  const zone = resolveStreakTimeZone(timeZone);
  const local = localParts(at, zone);
  const daysFromMonday = (local.weekday + 6) % 7;
  const start = new Date(Date.UTC(local.year, local.month - 1, local.day - daysFromMonday));
  return formatDateKey(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate());
}

export function weekEndUtc(weekStart: string, timeZone?: string | null) {
  const next = nextWeekStart(weekStart);
  const match = next.match(DATE_KEY);
  if (!match) return new Date(NaN);
  return localDateTime(
    resolveStreakTimeZone(timeZone),
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10),
    Number.parseInt(match[3], 10),
    0,
    0
  );
}

export function closedWeekStart(now: Date, timeZone?: string | null) {
  return previousWeekStart(mondayWeekStart(now, timeZone));
}

export function closedWeeksToEvaluate(input: {
  now: Date;
  timeZone?: string | null;
  lastEvaluatedWeek: string | null;
}) {
  const lastClosed = closedWeekStart(input.now, input.timeZone);
  if (!input.lastEvaluatedWeek) return [lastClosed];
  if (input.lastEvaluatedWeek >= lastClosed) return [];
  const weeks: string[] = [];
  let cursor = nextWeekStart(input.lastEvaluatedWeek);
  while (cursor <= lastClosed && weeks.length < 260) {
    weeks.push(cursor);
    cursor = nextWeekStart(cursor);
  }
  return weeks;
}

export function streakGridWeeks(currentMonday: string, count = STREAK_GRID_WEEKS) {
  const weeks: string[] = [];
  let cursor = shiftWeekKey(currentMonday, -7 * (count - 1));
  for (let i = 0; i < count; i += 1) {
    weeks.push(cursor);
    cursor = nextWeekStart(cursor);
  }
  return weeks;
}

export function countedWeekKeys(
  completedAt: Array<string | Date | null | undefined>,
  timeZone?: string | null
) {
  const zone = resolveStreakTimeZone(timeZone);
  const weeks = new Set<string>();
  for (const value of completedAt) {
    if (!value) continue;
    const at = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(at.getTime())) continue;
    weeks.add(mondayWeekStart(at, zone));
  }
  return weeks;
}

export function completionCountsForWeek(
  completedAt: Array<string | Date | null | undefined>,
  weekStart: string,
  timeZone?: string | null
) {
  return countedWeekKeys(completedAt, timeZone).has(weekStart);
}

export function fatherWeekStreak(input: {
  completedAt: Array<string | Date | null | undefined>;
  timeZone?: string | null;
  now?: Date;
}): FatherStreak {
  const timeZone = resolveStreakTimeZone(input.timeZone);
  const now = input.now ?? new Date();
  const weeks = countedWeekKeys(input.completedAt, timeZone);
  const thisWeek = mondayWeekStart(now, timeZone);
  const lastWeek = previousWeekStart(thisWeek);
  let cursor = weeks.has(thisWeek) ? thisWeek : weeks.has(lastWeek) ? lastWeek : null;
  if (!cursor) return { weeks: 0, weekKeys: [] };

  const weekKeys: string[] = [];
  while (weeks.has(cursor)) {
    weekKeys.push(cursor);
    cursor = previousWeekStart(cursor);
  }
  return { weeks: weekKeys.length, weekKeys };
}

export function ledgerFromCountedWeeks(weekStarts: Iterable<string>) {
  const ledger = new Map<string, LedgerOutcome>();
  for (const weekStart of weekStarts) {
    ledger.set(weekStart, "counted");
  }
  return ledger;
}

export function deriveCurrentStreak(
  weeks: Map<string, LedgerOutcome>,
  currentMonday: string
) {
  const current = weeks.get(currentMonday);
  let cursor = current === "counted" ? currentMonday : previousWeekStart(currentMonday);
  let count = 0;
  for (let i = 0; i < 520; i += 1) {
    const outcome = weeks.get(cursor);
    if (outcome === "counted") count += 1;
    else if (outcome === "frozen" || outcome === "neutral") {
      // Bridges. The week does not increment and does not reset.
    } else {
      break;
    }
    cursor = previousWeekStart(cursor);
  }
  return count;
}

export function deriveLongestStreak(weeks: Map<string, LedgerOutcome>) {
  if (weeks.size === 0) return 0;
  const keys = [...weeks.keys()].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of keys) {
    if (previous && nextWeekStart(previous) !== key) {
      longest = Math.max(longest, run);
      run = 0;
    }
    const outcome = weeks.get(key);
    if (outcome === "counted") run += 1;
    else if (outcome === "frozen" || outcome === "neutral") {
      // Keep the run.
    } else {
      longest = Math.max(longest, run);
      run = 0;
    }
    longest = Math.max(longest, run);
    previous = key;
  }
  return longest;
}

export function lastCountedWeek(weeks: Map<string, LedgerOutcome>) {
  let latest: string | null = null;
  for (const [weekStart, outcome] of weeks) {
    if (outcome !== "counted") continue;
    if (!latest || weekStart > latest) latest = weekStart;
  }
  return latest;
}

export function evaluateClosedWeek(input: EvaluateClosedWeekInput): EvaluateClosedWeekResult {
  if (input.alreadyRecorded) {
    return { kind: "noop", outcome: input.alreadyRecorded };
  }
  if (input.completedInWeek) return { kind: "counted" };
  if (!input.hadAssignedOpenSession) return { kind: "neutral" };
  if (input.timezoneChanged) return { kind: "neutral" };
  if (input.freezesRemaining > 0) {
    return { kind: "frozen", freezesRemaining: input.freezesRemaining - 1 };
  }
  return { kind: "missed" };
}

export function replenishFreezes(input: {
  freezesRemaining: number;
  lastReplenishedAt: Date;
  now: Date;
  max?: number;
  periodMs?: number;
}) {
  const max = input.max ?? MAX_FREEZES;
  const periodMs = input.periodMs ?? FREEZE_REPLENISH_DAYS * 24 * 60 * 60 * 1000;
  let freezesRemaining = clampFreezes(input.freezesRemaining, max);
  let lastReplenishedAt = input.lastReplenishedAt;
  let gained = 0;
  for (let i = 0; i < 120; i += 1) {
    if (lastReplenishedAt.getTime() + periodMs > input.now.getTime()) break;
    lastReplenishedAt = new Date(lastReplenishedAt.getTime() + periodMs);
    if (freezesRemaining < max) {
      freezesRemaining += 1;
      gained += 1;
    }
  }
  return { freezesRemaining, lastReplenishedAt, gained };
}

export function clampFreezes(value: number, max = MAX_FREEZES) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

export function completedBeforeWeekEnd(session: StreakSessionFact, weekEnd: Date) {
  if (!session.flagsComplete) return false;
  if (!session.completedAt) return true;
  return session.completedAt.getTime() < weekEnd.getTime();
}

function partCompleteByWeekEnd(
  trainingId: string,
  sessions: StreakSessionFact[],
  weekEnd: Date
) {
  const partSessions = sessions.filter((session) => session.trainingId === trainingId);
  if (partSessions.length === 0) return false;
  return partSessions.every((session) => completedBeforeWeekEnd(session, weekEnd));
}

export function trainingWasGatedAtWeekEnd(
  training: StreakTrainingFact,
  catalog: StreakTrainingFact[],
  sessions: StreakSessionFact[],
  weekEnd: Date
) {
  if (!training.seriesId || !training.partNumber || training.partNumber <= 1) return false;
  return catalog.some(
    (part) =>
      part.seriesId === training.seriesId &&
      (part.partNumber ?? 0) > 0 &&
      (part.partNumber ?? 0) < training.partNumber! &&
      !partCompleteByWeekEnd(part.id, sessions, weekEnd)
  );
}

export function hadAssignedOpenSession(input: {
  weekEnd: Date;
  trainings: StreakTrainingFact[];
  assignments: StreakAssignmentFact[];
  sessions: StreakSessionFact[];
}) {
  for (const assignment of input.assignments) {
    if (assignment.assignedAt.getTime() >= input.weekEnd.getTime()) continue;
    const training = input.trainings.find((row) => row.id === assignment.trainingId);
    if (!training) continue;
    if (trainingWasGatedAtWeekEnd(training, input.trainings, input.sessions, input.weekEnd)) {
      continue;
    }
    const catalog = input.sessions
      .filter((session) => session.trainingId === training.id)
      .sort((left, right) => left.catalogIndex - right.catalogIndex);
    if (catalog.some((session) => !completedBeforeWeekEnd(session, input.weekEnd))) {
      return true;
    }
  }
  return false;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
