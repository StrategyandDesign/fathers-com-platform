import type { TrainingProgress } from "@/lib/manager/types";

export const QUIET_AFTER_DAYS = 14;
export const NUDGE_COOLDOWN_DAYS = 7;

export const NUDGE_TEMPLATES = ["continue", "encouragement", "welcome_back"] as const;

export type NudgeTemplateKey = (typeof NUDGE_TEMPLATES)[number];

export type NudgeTemplate = {
  key: NudgeTemplateKey;
  label: string;
  preview: string;
  subject: string;
  title: string;
  body: (organizationName: string) => string;
  ctaLabel: string;
};

export type NudgeLogRow = {
  id: string;
  father_id: string;
  manager_id: string;
  template_key: NudgeTemplateKey;
  status: "sent" | "skipped_pref" | "failed";
  sent_at: string;
};

export const NUDGE_TEMPLATE_COPY: Record<NudgeTemplateKey, NudgeTemplate> = {
  continue: {
    key: "continue",
    label: "Continue",
    preview: "The next session is still open.",
    subject: "Your next session is still open",
    title: "Your next session is still open.",
    body: (organizationName) =>
      `There’s a session still open in the ${organizationName} training.\nYour place is saved. Continue where you left off.`,
    ctaLabel: "Continue training",
  },
  encouragement: {
    key: "encouragement",
    label: "Encouragement",
    preview: "He started. The next session is still open.",
    subject: "A note on your training",
    title: "You’re already in motion.",
    body: (organizationName) =>
      `The work you’ve started with ${organizationName} is still here.\nOpen the next session and keep going.`,
    ctaLabel: "Open training",
  },
  welcome_back: {
    key: "welcome_back",
    label: "Welcome back",
    preview: "The training is still here.",
    subject: "Your training is still open",
    title: "Your training is still open.",
    body: (organizationName) =>
      `Your ${organizationName} training is still open, and your progress is intact.\nSign in to continue.`,
    ctaLabel: "Sign in",
  },
};

export const NUDGE_STATUS_LABEL: Record<NudgeLogRow["status"], string> = {
  sent: "Sent",
  skipped_pref: "Not sent. Reminders off",
  failed: "Didn’t send",
};

export function isNudgeTemplate(value: string): value is NudgeTemplateKey {
  return (NUDGE_TEMPLATES as readonly string[]).includes(value);
}

export function daysSince(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - time) / 86_400_000);
}

export function isQuiet(lastActivity: string | null | undefined) {
  return daysSince(lastActivity) >= QUIET_AFTER_DAYS;
}

export function hasUnfinishedTraining(cards: TrainingProgress[]) {
  const assigned = cards.filter((card) => card.assigned && !card.gated);
  if (assigned.length === 0) return true;
  return assigned.some((card) => card.total === 0 || card.completed < card.total);
}

export function needsNudge(
  lastActivity: string | null | undefined,
  cards: TrainingProgress[]
) {
  return isQuiet(lastActivity) && hasUnfinishedTraining(cards);
}

export function quietLabel(lastActivity: string | null | undefined) {
  const days = daysSince(lastActivity);
  if (!Number.isFinite(days)) return "No activity yet";
  if (days === 0) return "Active today";
  if (days === 1) return "1 day quiet";
  return `${days} days quiet`;
}

export function latestSentAt(rows: NudgeLogRow[]) {
  return rows.find((row) => row.status === "sent")?.sent_at ?? null;
}

export function cooldownRemaining(rows: NudgeLogRow[]) {
  const lastSent = latestSentAt(rows);
  if (!lastSent) return 0;
  const elapsed = daysSince(lastSent);
  if (elapsed >= NUDGE_COOLDOWN_DAYS) return 0;
  return NUDGE_COOLDOWN_DAYS - elapsed;
}
