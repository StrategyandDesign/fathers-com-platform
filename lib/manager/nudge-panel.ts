import { isSessionComplete, type SessionProgress } from "@/lib/father/types";
import { isLocale, localeDir, type Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/translate";
import type { TrainingAssignment, TrainingProgress } from "@/lib/manager/types";
import { NUDGE_COOLDOWN_DAYS } from "@/lib/manager/nudges";
import { pickChannel } from "@/lib/notifications/channel";
import { notificationCopy } from "@/lib/notifications/copy";
import { filmRuntimeMinutes } from "@/lib/trainings/runtime";
import type { NotificationLocale, NotificationPayload } from "@/lib/notifications/types";

export const STALL_AFTER_DAYS = 10;
export const LONG_QUIET_DAYS = 30;
export const NUDGE_PANEL_CAP = 10;

export type NudgeTier = "A" | "B" | "C";

export type NudgeReachability = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  hasPush: boolean;
  leaderEncouragement: boolean;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  prefsLocale?: string | null;
  profileLocale?: string | null;
};

export type NudgePanelFather = {
  fatherId: string;
  name: string;
  groupLocale?: string | null;
  cards: TrainingProgress[];
  progress: SessionProgress[];
  assignments: TrainingAssignment[];
  lastNudgeAt?: string | null;
  reachability?: NudgeReachability | null;
};

export type NudgePanelRow = {
  fatherId: string;
  name: string;
  context: string;
  canReach: boolean;
  title: string;
  body: string;
  locale: Locale;
  dir: "ltr" | "rtl";
};

export type NudgePanelView = {
  rows: NudgePanelRow[];
  hiddenCount: number;
  reachableCount: number;
};

export function daysSinceAt(value: string | null | undefined, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - time) / 86_400_000);
}

export function lastCompletedSessionAt(progress: SessionProgress[]) {
  let latest: string | null = null;
  for (const row of progress) {
    if (!isSessionComplete(row) || !row.completed_at) continue;
    if (!latest || row.completed_at > latest) latest = row.completed_at;
  }
  return latest;
}

export function completedSessionCount(progress: SessionProgress[]) {
  return progress.filter((row) => isSessionComplete(row)).length;
}

export function assignedAtFor(
  fatherId: string,
  trainingId: string,
  assignments: TrainingAssignment[]
) {
  return (
    assignments.find((row) => row.father_id === fatherId && row.training_id === trainingId)
      ?.assigned_at ?? null
  );
}

export function activeIncompleteCard(
  fatherId: string,
  cards: TrainingProgress[],
  assignments: TrainingAssignment[]
) {
  const open = cards.filter(
    (card) => card.assigned && !card.gated && card.total > 0 && card.completed < card.total
  );
  if (open.length === 0) return null;
  const started = open.filter((card) => card.completed > 0);
  if (started.length > 0) return started[0] ?? null;
  return [...open].sort((left, right) => {
    const leftAt = Date.parse(assignedAtFor(fatherId, left.training.id, assignments) ?? "") || 0;
    const rightAt = Date.parse(assignedAtFor(fatherId, right.training.id, assignments) ?? "") || 0;
    return leftAt - rightAt;
  })[0] ?? null;
}

export function nudgeTier(input: { completedCount: number; daysSinceLastSession: number }): NudgeTier | null {
  if (!Number.isFinite(input.daysSinceLastSession) || input.daysSinceLastSession < STALL_AFTER_DAYS) {
    return null;
  }
  if (input.completedCount === 0) return "A";
  if (input.daysSinceLastSession >= LONG_QUIET_DAYS) return "C";
  return "B";
}

export function canReachFather(reach: NudgeReachability | null | undefined) {
  if (!reach) return true;
  if (!reach.leaderEncouragement) return false;
  return (
    pickChannel({
      prefs: { pushEnabled: reach.pushEnabled, emailEnabled: reach.emailEnabled },
      hasPushSubscription: reach.hasPush,
    }) !== null
  );
}

export function leaderFirstName(fullName: string | null | undefined) {
  const text = (fullName ?? "").trim();
  if (!text) return "";
  return text.split(/\s+/)[0] ?? "";
}

export function resolveFatherLocale(input: {
  profileLocale?: string | null;
  groupLocale?: string | null;
  prefsLocale?: string | null;
}): Locale {
  if (isLocale(input.profileLocale)) return input.profileLocale;
  if (isLocale(input.groupLocale)) return input.groupLocale;
  if (isLocale(input.prefsLocale)) return input.prefsLocale;
  return "en";
}

export function nudgedWithinCooldown(lastNudgeAt: string | null | undefined, now: Date) {
  return daysSinceAt(lastNudgeAt, now) < NUDGE_COOLDOWN_DAYS;
}

export function encouragementPayload(input: {
  tier: NudgeTier;
  leaderFirstName: string;
  minutes: number | null;
  completed: number;
  total: number;
  trainingTitle: string;
}): NotificationPayload {
  return {
    nudgeTier: input.tier,
    leaderName: input.leaderFirstName,
    minutes: input.minutes ?? undefined,
    completedCount: input.completed,
    sessionCount: input.total,
    trainingTitle: input.trainingTitle,
  };
}

export function nudgeMessage(input: {
  tier: NudgeTier;
  locale: NotificationLocale;
  leaderFirstName: string;
  minutes: number | null;
  completed: number;
  total: number;
  trainingTitle: string;
}) {
  return notificationCopy(
    "leader_encouragement",
    encouragementPayload(input),
    input.locale
  );
}

export function nudgeContextLine(
  input: {
    tier: NudgeTier;
    days: number;
    assignedDays: number;
    completed: number;
    total: number;
  },
  t: Translate
) {
  if (input.tier === "A") {
    return input.assignedDays === 1
      ? t("manager.nudgePanel.assignedNotStartedOne")
      : t("manager.nudgePanel.assignedNotStarted", { days: input.assignedDays });
  }
  if (input.tier === "B") {
    return input.days === 1
      ? t("manager.nudgePanel.lastSessionProgressOne", {
          completed: input.completed,
          total: input.total,
        })
      : t("manager.nudgePanel.lastSessionProgress", {
          days: input.days,
          completed: input.completed,
          total: input.total,
        });
  }
  return input.days === 1
    ? t("manager.nudgePanel.lastSessionOne")
    : t("manager.nudgePanel.lastSession", { days: input.days });
}

export function describeStall(father: NudgePanelFather, now: Date) {
  const card = activeIncompleteCard(father.fatherId, father.cards, father.assignments);
  if (!card) return null;
  const completedCount = completedSessionCount(father.progress);
  const lastCompletedAt = lastCompletedSessionAt(father.progress);
  const assignedAt = assignedAtFor(father.fatherId, card.training.id, father.assignments);
  const daysSinceLastSession = daysSinceAt(lastCompletedAt ?? assignedAt, now);
  const tier = nudgeTier({ completedCount, daysSinceLastSession });
  if (!tier) return null;
  const assignedDays = daysSinceAt(assignedAt, now);
  const minutes = filmRuntimeMinutes(card.current?.session.duration_seconds);
  return {
    tier,
    card,
    daysSinceLastSession,
    assignedDays: Number.isFinite(assignedDays) ? assignedDays : daysSinceLastSession,
    completedCount,
    currentCompleted: card.completed,
    currentTotal: card.total,
    minutes,
    trainingTitle: card.training.title,
  };
}

export function buildNudgePanel(input: {
  role: string | null | undefined;
  fathers: NudgePanelFather[];
  leaderFirstName: string;
  t: Translate;
  now?: Date;
}): NudgePanelView {
  if (input.role !== "manager") {
    return { rows: [], hiddenCount: 0, reachableCount: 0 };
  }

  const now = input.now ?? new Date();
  const qualified: Array<{ father: NudgePanelFather; stall: NonNullable<ReturnType<typeof describeStall>> }> =
    [];

  for (const father of input.fathers) {
    if (nudgedWithinCooldown(father.lastNudgeAt, now)) continue;
    const stall = describeStall(father, now);
    if (!stall) continue;
    qualified.push({ father, stall });
  }

  qualified.sort((left, right) => {
    const dayGap = right.stall.daysSinceLastSession - left.stall.daysSinceLastSession;
    if (dayGap !== 0) return dayGap;
    return left.father.name.localeCompare(right.father.name);
  });

  const hiddenCount = Math.max(0, qualified.length - NUDGE_PANEL_CAP);
  const rows = qualified.slice(0, NUDGE_PANEL_CAP).map(({ father, stall }) => {
    const locale = resolveFatherLocale({
      profileLocale: father.reachability?.profileLocale,
      groupLocale: father.groupLocale,
      prefsLocale: father.reachability?.prefsLocale,
    });
    const copy = nudgeMessage({
      tier: stall.tier,
      locale,
      leaderFirstName: input.leaderFirstName,
      minutes: stall.minutes,
      completed: stall.currentCompleted,
      total: stall.currentTotal,
      trainingTitle: stall.trainingTitle,
    });
    return {
      fatherId: father.fatherId,
      name: father.name,
      context: nudgeContextLine(
        {
          tier: stall.tier,
          days: stall.daysSinceLastSession,
          assignedDays: stall.assignedDays,
          completed: stall.currentCompleted,
          total: stall.currentTotal,
        },
        input.t
      ),
      canReach: canReachFather(father.reachability),
      title: copy.title,
      body: copy.body,
      locale,
      dir: localeDir(locale),
    };
  });

  return {
    rows,
    hiddenCount,
    reachableCount: rows.filter((row) => row.canReach).length,
  };
}
