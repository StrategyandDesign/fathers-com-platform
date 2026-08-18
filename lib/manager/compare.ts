import type { SessionProgress } from "@/lib/father/types";
import { dateLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { fullyCompletedTraining, percent, startedTraining } from "@/lib/manager/impact";
import type { Certificate, Group, ParticipantRow, TrainingProgress } from "@/lib/manager/types";

export const COMPARE_MODES = ["groups", "periods"] as const;
export const COMPARE_WINDOWS = ["month", "30"] as const;

export type CompareMode = (typeof COMPARE_MODES)[number];
export type CompareWindow = (typeof COMPARE_WINDOWS)[number];

export type CompareSide = {
  key: string;
  label: string;
  detail: string;
  enrolled: number;
  startedPct: number;
  startedCount: number;
  completedPct: number;
  completedCount: number;
  certificates: number;
};

export type CompareRow = {
  label: string;
  hint: string;
  left: string;
  leftDetail?: string;
  right: string;
  rightDetail?: string;
  delta: string;
  better: "left" | "right" | "same";
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMode(value: string): value is CompareMode {
  return (COMPARE_MODES as readonly string[]).includes(value);
}

function isWindow(value: string): value is CompareWindow {
  return (COMPARE_WINDOWS as readonly string[]).includes(value);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function inRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  return time >= start.getTime() && time < end.getTime();
}

function formatRange(start: Date, endExclusive: Date, locale: Locale = DEFAULT_LOCALE) {
  const end = addUtcDays(endExclusive, -1);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };
  const loc = dateLocale(locale);
  return `${start.toLocaleDateString(loc, options)}–${end.toLocaleDateString(loc, options)}`;
}

function monthWindow(offset: number, locale: Locale = DEFAULT_LOCALE) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
  return {
    start,
    end,
    label: start.toLocaleDateString(dateLocale(locale), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

function rollingWindow(offset: number, locale: Locale = DEFAULT_LOCALE) {
  const t = createTranslator(locale);
  const currentEnd = addUtcDays(startOfUtcDay(new Date()), 1);
  const end = addUtcDays(currentEnd, -offset * 30);
  const start = addUtcDays(end, -30);
  return {
    start,
    end,
    label: offset === 0 ? t("manager.compare.last30") : t("manager.compare.previous30"),
    range: formatRange(start, end, locale),
  };
}

export function parseCompareSearchParams(params: {
  mode?: string;
  window?: string;
  left?: string;
  right?: string;
  error?: string;
}) {
  const modeRaw = params.mode?.trim() ?? "";
  const windowRaw = params.window?.trim() ?? "";
  const left = params.left?.trim() && UUID.test(params.left.trim()) ? params.left.trim() : null;
  const right = params.right?.trim() && UUID.test(params.right.trim()) ? params.right.trim() : null;

  return {
    mode: isMode(modeRaw) ? modeRaw : null,
    window: isWindow(windowRaw) ? windowRaw : "month",
    left,
    right,
    error: params.error,
  };
}

function snapshotSide(
  key: string,
  label: string,
  detail: string,
  members: ParticipantRow[],
  progressByFather: Map<string, SessionProgress[]>,
  trainingProgressFor: (fatherId: string) => TrainingProgress[],
  certificates: Certificate[]
): CompareSide {
  const ids = new Set(members.map((row) => row.fatherId));
  let started = 0;
  let completed = 0;
  for (const member of members) {
    if (startedTraining(progressByFather.get(member.fatherId) ?? [])) started += 1;
    if (fullyCompletedTraining(trainingProgressFor(member.fatherId))) completed += 1;
  }
  const certs = certificates.filter((row) => ids.has(row.father_id)).length;
  return {
    key,
    label,
    detail,
    enrolled: members.length,
    startedCount: started,
    startedPct: percent(started, members.length),
    completedCount: completed,
    completedPct: percent(completed, members.length),
    certificates: certs,
  };
}

function periodSide(
  key: string,
  label: string,
  detail: string,
  start: Date,
  end: Date,
  participants: ParticipantRow[],
  progressByFather: Map<string, SessionProgress[]>,
  trainingProgressFor: (fatherId: string) => TrainingProgress[],
  certificates: Certificate[]
): CompareSide {
  const cohort = participants.filter((row) => inRange(row.joinedAt, start, end));
  let started = 0;
  let completed = 0;
  for (const member of cohort) {
    if (startedTraining(progressByFather.get(member.fatherId) ?? [])) started += 1;
    if (fullyCompletedTraining(trainingProgressFor(member.fatherId))) completed += 1;
  }
  return {
    key,
    label,
    detail,
    enrolled: cohort.length,
    startedCount: started,
    startedPct: percent(started, cohort.length),
    completedCount: completed,
    completedPct: percent(completed, cohort.length),
    certificates: certificates.filter((row) => inRange(row.issued_at, start, end)).length,
  };
}

function deltaCount(left: number, right: number) {
  const delta = left - right;
  if (delta === 0) return { text: "Same", better: "same" as const };
  if (delta > 0) return { text: `+${delta}`, better: "left" as const };
  return { text: String(delta), better: "right" as const };
}

function deltaPct(left: number, right: number) {
  const delta = left - right;
  if (delta === 0) return { text: "Same", better: "same" as const };
  if (delta > 0) return { text: `+${delta} pts`, better: "left" as const };
  return { text: `${delta} pts`, better: "right" as const };
}

export function compareRows(left: CompareSide, right: CompareSide): CompareRow[] {
  const enrolled = deltaCount(left.enrolled, right.enrolled);
  const started = deltaPct(left.startedPct, right.startedPct);
  const completed = deltaPct(left.completedPct, right.completedPct);
  const certs = deltaCount(left.certificates, right.certificates);

  return [
    {
      label: "Enrollment",
      hint: "People in this group, or who joined in this period.",
      left: String(left.enrolled),
      right: String(right.enrolled),
      delta: enrolled.text,
      better: enrolled.better,
    },
    {
      label: "Start rate",
      hint: "Share who began film, check-in, or action.",
      left: `${left.startedPct}%`,
      leftDetail: `${left.startedCount} of ${left.enrolled}`,
      right: `${right.startedPct}%`,
      rightDetail: `${right.startedCount} of ${right.enrolled}`,
      delta: started.text,
      better: started.better,
    },
    {
      label: "Completion rate",
      hint: "Share who finished every session in a training.",
      left: `${left.completedPct}%`,
      leftDetail: `${left.completedCount} of ${left.enrolled}`,
      right: `${right.completedPct}%`,
      rightDetail: `${right.completedCount} of ${right.enrolled}`,
      delta: completed.text,
      better: completed.better,
    },
    {
      label: "Certificates",
      hint: "On file for the group, or issued in the period.",
      left: String(left.certificates),
      right: String(right.certificates),
      delta: certs.text,
      better: certs.better,
    },
  ];
}

export async function loadManagerCompare(
  managerId: string,
  filters: ReturnType<typeof parseCompareSearchParams>,
  locale: Locale = DEFAULT_LOCALE
) {
  const workspace = await loadManagerWorkspace(managerId);
  const { groups, participants, progress, certificates, trainingProgressFor } = workspace;

  const progressByFather = new Map<string, SessionProgress[]>();
  for (const row of progress) {
    const list = progressByFather.get(row.father_id) ?? [];
    list.push(row);
    progressByFather.set(row.father_id, list);
  }

  const mode: CompareMode =
    filters.mode ?? (groups.length >= 2 ? "groups" : "periods");

  if (mode === "groups") {
    if (groups.length < 2) {
      return {
        mode,
        window: filters.window,
        groups,
        left: null as CompareSide | null,
        right: null as CompareSide | null,
        error: "Add a second group to compare groups. Time periods still work.",
      };
    }

    const leftGroup = pickGroup(groups, filters.left, 0);
    const rightGroup = pickGroup(
      groups.filter((group) => group.id !== leftGroup.id),
      filters.right,
      0
    );
    if (leftGroup.id === rightGroup.id) {
      return {
        mode,
        window: filters.window,
        groups,
        left: null,
        right: null,
        error: "Choose two different groups.",
      };
    }

    const leftMembers = participants.filter((row) => row.groupId === leftGroup.id);
    const rightMembers = participants.filter((row) => row.groupId === rightGroup.id);

    return {
      mode,
      window: filters.window,
      groups,
      left: snapshotSide(
        leftGroup.id,
        leftGroup.name,
        "Current members",
        leftMembers,
        progressByFather,
        trainingProgressFor,
        certificates
      ),
      right: snapshotSide(
        rightGroup.id,
        rightGroup.name,
        "Current members",
        rightMembers,
        progressByFather,
        trainingProgressFor,
        certificates
      ),
      error: filters.error,
    };
  }

  if (filters.window === "30") {
    const current = rollingWindow(0, locale);
    const previous = rollingWindow(1, locale);
    return {
      mode,
      window: filters.window,
      groups,
      left: periodSide(
        "current-30",
        current.label,
        current.range,
        current.start,
        current.end,
        participants,
        progressByFather,
        trainingProgressFor,
        certificates
      ),
      right: periodSide(
        "previous-30",
        previous.label,
        previous.range,
        previous.start,
        previous.end,
        participants,
        progressByFather,
        trainingProgressFor,
        certificates
      ),
      error: filters.error,
    };
  }

  const t = createTranslator(locale);
  const thisMonth = monthWindow(0, locale);
  const lastMonth = monthWindow(-1, locale);
  return {
    mode,
    window: filters.window,
    groups,
    left: periodSide(
      "this-month",
      thisMonth.label,
      t("manager.compare.joinedThisMonth"),
      thisMonth.start,
      thisMonth.end,
      participants,
      progressByFather,
      trainingProgressFor,
      certificates
    ),
    right: periodSide(
      "last-month",
      lastMonth.label,
      t("manager.compare.joinedLastMonth"),
      lastMonth.start,
      lastMonth.end,
      participants,
      progressByFather,
      trainingProgressFor,
      certificates
    ),
    error: filters.error,
  };
}

function pickGroup(groups: Group[], id: string | null, fallbackIndex: number) {
  return groups.find((group) => group.id === id) ?? groups[fallbackIndex] ?? groups[0];
}
