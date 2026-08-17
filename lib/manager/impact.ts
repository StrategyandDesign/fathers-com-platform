import { isSessionComplete, type SessionProgress } from "@/lib/father/types";
import { dateLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";
import { loadManagerWorkspace } from "@/lib/manager/data";
import type { TrainingProgress } from "@/lib/manager/types";

export const IMPACT_PERIOD_DAYS = 30;

export type ImpactCount = {
  current: number;
  previous: number;
};

export type ImpactSnapshot = {
  organizationNames: string[];
  generatedAt: string;
  periodDays: number;
  currentRangeLabel: string;
  previousRangeLabel: string;
  enrolled: number;
  startedTraining: number;
  startedTrainingPct: number;
  completedOneSession: number;
  completedOneSessionPct: number;
  fullyCompleted: number;
  fullyCompletedPct: number;
  certificatesIssued: number;
  activeParticipants: number;
  trainings: Array<{
    title: string;
    started: number;
    completedOneSession: number;
    fullyCompleted: number;
  }>;
  trend: {
    enrolled: ImpactCount;
    sessionsCompleted: ImpactCount;
    certificatesIssued: ImpactCount;
  };
};

export function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatRange(start: Date, endExclusive: Date, locale: Locale = DEFAULT_LOCALE) {
  const end = addUtcDays(endExclusive, -1);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const loc = locale === "he" ? dateLocale(locale) : "en-US";
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = start.toLocaleDateString(loc, {
    ...options,
    year: sameYear ? undefined : "numeric",
  });
  const endLabel = end.toLocaleDateString(loc, { ...options, year: "numeric" });
  return `${startLabel}–${endLabel}`;
}

function inRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  return time >= start.getTime() && time < end.getTime();
}

function startedSession(row: SessionProgress) {
  return (
    row.film_completed ||
    row.checkin_completed ||
    row.action_completed ||
    row.status === "in_progress" ||
    row.status === "completed"
  );
}

export function startedTraining(progress: SessionProgress[]) {
  return progress.some(startedSession);
}

export function completedOneSession(progress: SessionProgress[]) {
  return progress.some((row) => isSessionComplete(row));
}

export function fullyCompletedTraining(cards: TrainingProgress[]) {
  return cards.some((card) => card.total > 0 && card.completed === card.total);
}

export function trendLabel(
  current: number,
  previous: number,
  locale: Locale = DEFAULT_LOCALE
) {
  const delta = current - previous;
  if (locale !== "he") {
    if (delta === 0) return "Same as previous 30 days";
    if (delta > 0) return `+${delta} vs previous 30 days`;
    return `${delta} vs previous 30 days`;
  }
  const t = createTranslator(locale);
  if (delta === 0) return t("manager.impact.same");
  if (delta > 0) return t("manager.impact.plus", { n: delta });
  return t("manager.impact.minus", { n: Math.abs(delta) });
}

export function impactFilename() {
  return `fathers-com-impact-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export async function loadManagerImpact(
  managerId: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<ImpactSnapshot> {
  const workspace = await loadManagerWorkspace(managerId);
  const { groups, trainings, participants, progress, certificates, trainingProgressFor } =
    workspace;

  const now = new Date();
  const currentEnd = addUtcDays(startOfUtcDay(now), 1);
  const currentStart = addUtcDays(currentEnd, -IMPACT_PERIOD_DAYS);
  const previousStart = addUtcDays(currentStart, -IMPACT_PERIOD_DAYS);

  const progressByFather = new Map<string, SessionProgress[]>();
  for (const row of progress) {
    const list = progressByFather.get(row.father_id) ?? [];
    list.push(row);
    progressByFather.set(row.father_id, list);
  }

  const enrolled = participants.length;
  let started = 0;
  let oneSession = 0;
  let finished = 0;
  let active = 0;

  const trainingStats = trainings.map((training) => ({
    title: training.title,
    started: 0,
    completedOneSession: 0,
    fullyCompleted: 0,
  }));

  for (const participant of participants) {
    const fatherProgress = progressByFather.get(participant.fatherId) ?? [];
    const cards = trainingProgressFor(participant.fatherId);
    if (startedTraining(fatherProgress)) started += 1;
    if (completedOneSession(fatherProgress)) oneSession += 1;
    if (fullyCompletedTraining(cards)) finished += 1;
    if (inRange(participant.lastActivity, currentStart, currentEnd)) active += 1;

    for (const [index, training] of trainings.entries()) {
      const card = cards.find((row) => row.training.id === training.id);
      const sessionIds = new Set((card?.sessions ?? []).map((session) => session.id));
      const scoped = fatherProgress.filter((row) => sessionIds.has(row.session_id));
      if (startedTraining(scoped)) trainingStats[index].started += 1;
      if (completedOneSession(scoped)) trainingStats[index].completedOneSession += 1;
      if (card && card.total > 0 && card.completed === card.total) {
        trainingStats[index].fullyCompleted += 1;
      }
    }
  }

  const countIn = (
    values: Array<string | null | undefined>,
    start: Date,
    end: Date
  ) => values.filter((value) => inRange(value, start, end)).length;

  const joined = participants.map((row) => row.joinedAt);
  const completedAts = progress
    .filter((row) => isSessionComplete(row))
    .map((row) => row.completed_at);
  const issuedAts = certificates.map((row) => row.issued_at);

  return {
    organizationNames: groups.map((group) => group.name).filter(Boolean),
    generatedAt: now.toISOString(),
    periodDays: IMPACT_PERIOD_DAYS,
    currentRangeLabel: formatRange(currentStart, currentEnd, locale),
    previousRangeLabel: formatRange(previousStart, currentStart, locale),
    enrolled,
    startedTraining: started,
    startedTrainingPct: percent(started, enrolled),
    completedOneSession: oneSession,
    completedOneSessionPct: percent(oneSession, enrolled),
    fullyCompleted: finished,
    fullyCompletedPct: percent(finished, enrolled),
    certificatesIssued: certificates.length,
    activeParticipants: active,
    trainings: trainingStats,
    trend: {
      enrolled: {
        current: countIn(joined, currentStart, currentEnd),
        previous: countIn(joined, previousStart, currentStart),
      },
      sessionsCompleted: {
        current: countIn(completedAts, currentStart, currentEnd),
        previous: countIn(completedAts, previousStart, currentStart),
      },
      certificatesIssued: {
        current: countIn(issuedAts, currentStart, currentEnd),
        previous: countIn(issuedAts, previousStart, currentStart),
      },
    },
  };
}
