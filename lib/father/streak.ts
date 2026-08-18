import { localParts, parseTimeZone } from "@/lib/notifications/schedule";

export type FatherStreak = {
  weeks: number;
  weekKeys: string[];
};

function weekStartKey(at: Date, timeZone: string) {
  const local = localParts(at, timeZone);
  const start = new Date(Date.UTC(local.year, local.month - 1, local.day - local.weekday));
  const year = start.getUTCFullYear();
  const month = String(start.getUTCMonth() + 1).padStart(2, "0");
  const day = String(start.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftWeekKey(weekKey: string, days: number) {
  const match = weekKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return weekKey;
  const start = new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10) + days
    )
  );
  const year = start.getUTCFullYear();
  const month = String(start.getUTCMonth() + 1).padStart(2, "0");
  const day = String(start.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fatherWeekStreak(input: {
  completedAt: Array<string | Date | null | undefined>;
  timeZone?: string | null;
  now?: Date;
}): FatherStreak {
  const timeZone = parseTimeZone(input.timeZone) ?? "UTC";
  const now = input.now ?? new Date();
  const weeks = new Set<string>();

  for (const value of input.completedAt) {
    if (!value) continue;
    const at = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(at.getTime())) continue;
    weeks.add(weekStartKey(at, timeZone));
  }

  const thisWeek = weekStartKey(now, timeZone);
  const lastWeek = shiftWeekKey(thisWeek, -7);
  let cursor = weeks.has(thisWeek) ? thisWeek : weeks.has(lastWeek) ? lastWeek : null;
  if (!cursor) return { weeks: 0, weekKeys: [] };

  const weekKeys: string[] = [];
  while (weeks.has(cursor)) {
    weekKeys.push(cursor);
    cursor = shiftWeekKey(cursor, -7);
  }

  return { weeks: weekKeys.length, weekKeys };
}
