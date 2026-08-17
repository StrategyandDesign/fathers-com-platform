import { createClient } from "@/lib/supabase/server";
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
    label: "Gentle continue",
    preview: "A calm note that the next session is still here. No rush.",
    subject: "Your next session is still here",
    title: "Whenever you’re ready.",
    body: (organizationName) =>
      `There’s a session waiting when you have a few minutes.\nYour place in the ${organizationName} training is saved. Pick it up where you left off — nothing expired.`,
    ctaLabel: "Continue training",
  },
  encouragement: {
    key: "encouragement",
    label: "Encouragement",
    preview: "Acknowledge the work already started. Invite him back when it fits.",
    subject: "A note on your training",
    title: "You’re already in motion.",
    body: (organizationName) =>
      `The work you’ve started with ${organizationName} is still here.\nWhen you have a quiet stretch, open the next session and keep going. No catch-up required.`,
    ctaLabel: "Open training",
  },
  welcome_back: {
    key: "welcome_back",
    label: "Welcome back",
    preview: "A light check-in after some time away. Adult and unhurried.",
    subject: "Your training is still open",
    title: "Welcome back whenever it fits.",
    body: (organizationName) =>
      `It’s been a little while. Your ${organizationName} training is still open, and your progress is intact.\nSign in when you’re ready.`,
    ctaLabel: "Sign in",
  },
};

export const NUDGE_STATUS_LABEL: Record<NudgeLogRow["status"], string> = {
  sent: "Sent",
  skipped_pref: "Not sent — reminders off",
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
  const assigned = cards.filter((card) => card.assigned);
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

export async function loadNudgeHistory(fatherIds: string[]) {
  if (fatherIds.length === 0) {
    return { byFather: new Map<string, NudgeLogRow[]>(), unavailable: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manager_nudges")
    .select("id, father_id, manager_id, template_key, status, sent_at")
    .in("father_id", fatherIds)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("[nudges] history lookup failed", error.message);
    return { byFather: new Map<string, NudgeLogRow[]>(), unavailable: true };
  }

  const byFather = new Map<string, NudgeLogRow[]>();
  for (const row of (data ?? []) as NudgeLogRow[]) {
    const list = byFather.get(row.father_id) ?? [];
    list.push(row);
    byFather.set(row.father_id, list);
  }
  return { byFather, unavailable: false };
}

export async function loadReminderPrefs(fatherIds: string[]) {
  const entries = await Promise.all(
    fatherIds.map(async (fatherId) => [fatherId, await loadReminderPrefAllowed(fatherId)] as const)
  );
  return new Map(entries);
}

export async function loadReminderPrefAllowed(fatherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("notification_recipient", {
    target_user_id: fatherId,
    pref_key: "session_reminders",
  });
  if (error) {
    console.error("[nudges] reminder pref lookup failed", error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean } | null;
  if (!row) return null;
  return Boolean(row.allowed);
}
