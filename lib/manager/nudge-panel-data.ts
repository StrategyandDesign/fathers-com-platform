import "server-only";

import { NUDGE_COOLDOWN_DAYS } from "@/lib/manager/nudges";
import {
  buildNudgePanel,
  leaderFirstName,
  type NudgePanelFather,
  type NudgePanelView,
  type NudgeReachability,
} from "@/lib/manager/nudge-panel";
import type { loadManagerWorkspace } from "@/lib/manager/data";
import { parseClock, parseTimeZone } from "@/lib/notifications/schedule";
import { DEFAULT_QUIET_END, DEFAULT_QUIET_START } from "@/lib/notifications/types";
import type { Translate } from "@/lib/i18n/translate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Workspace = Awaited<ReturnType<typeof loadManagerWorkspace>>;

function asBool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseReachability(row: Record<string, unknown>): NudgeReachability {
  return {
    pushEnabled: asBool(row.push_enabled ?? row.pushEnabled, true),
    emailEnabled: asBool(row.email_enabled ?? row.emailEnabled, true),
    hasPush: asBool(row.has_push ?? row.hasPush, false),
    leaderEncouragement: asBool(row.leader_encouragement ?? row.leaderEncouragement, true),
    timezone: parseTimeZone(row.timezone) ?? "UTC",
    quietHoursStart: parseClock(row.quiet_hours_start ?? row.quietHoursStart) ?? DEFAULT_QUIET_START,
    quietHoursEnd: parseClock(row.quiet_hours_end ?? row.quietHoursEnd) ?? DEFAULT_QUIET_END,
    prefsLocale: typeof row.prefs_locale === "string" ? row.prefs_locale : typeof row.locale === "string" ? row.locale : null,
    profileLocale: typeof row.profile_locale === "string" ? row.profile_locale : null,
  };
}

function latestByFather(rows: Array<{ id: string; at: string }>) {
  const latest = new Map<string, string>();
  for (const row of rows) {
    const prev = latest.get(row.id);
    if (!prev || row.at > prev) latest.set(row.id, row.at);
  }
  return latest;
}

async function loadRecentEncouragements(fatherIds: string[], since: Date) {
  if (fatherIds.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const sinceIso = since.toISOString();
  const [nudgesRes, deliveriesRes] = await Promise.all([
    supabase
      .from("manager_nudges")
      .select("father_id, sent_at, status")
      .in("father_id", fatherIds)
      .eq("status", "sent")
      .gte("sent_at", sinceIso),
    supabase
      .from("notification_deliveries")
      .select("user_id, created_at, status, type")
      .in("user_id", fatherIds)
      .eq("type", "leader_encouragement")
      .eq("status", "sent")
      .gte("created_at", sinceIso),
  ]);

  const rows: Array<{ id: string; at: string }> = [];
  for (const row of (nudgesRes.data ?? []) as Array<{ father_id: string; sent_at: string }>) {
    rows.push({ id: row.father_id, at: row.sent_at });
  }
  for (const row of (deliveriesRes.data ?? []) as Array<{ user_id: string; created_at: string }>) {
    rows.push({ id: row.user_id, at: row.created_at });
  }
  return latestByFather(rows);
}

async function loadReachability(fatherIds: string[]) {
  const byId = new Map<string, NudgeReachability>();
  if (fatherIds.length === 0) return byId;

  const admin = createAdminClient();
  if (admin) {
    const [prefsRes, pushRes, profileRes] = await Promise.all([
      admin
        .from("notification_preferences")
        .select(
          "user_id, push_enabled, email_enabled, leader_encouragement, timezone, quiet_hours_start, quiet_hours_end, locale"
        )
        .in("user_id", fatherIds),
      admin.from("push_subscriptions").select("user_id").in("user_id", fatherIds),
      admin.from("profiles").select("id, locale").in("id", fatherIds),
    ]);
    const pushUsers = new Set(
      ((pushRes.data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)
    );
    const localeByUser = new Map(
      ((profileRes.data ?? []) as Array<{ id: string; locale: string | null }>).map((row) => [
        row.id,
        row.locale,
      ])
    );
    for (const row of (prefsRes.data ?? []) as Array<Record<string, unknown>>) {
      const userId = typeof row.user_id === "string" ? row.user_id : "";
      if (!userId) continue;
      byId.set(
        userId,
        parseReachability({
          ...row,
          has_push: pushUsers.has(userId),
          prefs_locale: row.locale,
          profile_locale: localeByUser.get(userId) ?? null,
        })
      );
    }
    for (const fatherId of fatherIds) {
      if (byId.has(fatherId)) continue;
      byId.set(
        fatherId,
        parseReachability({
          has_push: pushUsers.has(fatherId),
          profile_locale: localeByUser.get(fatherId) ?? null,
        })
      );
    }
    return byId;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("notification_reachability_many", {
    target_ids: fatherIds,
  });
  if (error) {
    console.error("[nudge-panel] reachability lookup failed", error.message);
    return byId;
  }
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    if (!userId) continue;
    byId.set(userId, parseReachability(row));
  }
  return byId;
}

async function loadLeaderFirstName(managerId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", managerId).maybeSingle();
  return leaderFirstName((data as { full_name?: string | null } | null)?.full_name);
}

export async function loadNudgePanel(input: {
  role: string | null | undefined;
  managerId: string;
  workspace: Workspace;
  t: Translate;
  now?: Date;
}): Promise<NudgePanelView> {
  if (input.role !== "manager") {
    return { rows: [], hiddenCount: 0, reachableCount: 0 };
  }

  const now = input.now ?? new Date();
  const fatherIds = input.workspace.participants.map((row) => row.fatherId);
  const since = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * 86_400_000);
  const [recent, reachability, firstName] = await Promise.all([
    loadRecentEncouragements(fatherIds, since),
    loadReachability(fatherIds),
    loadLeaderFirstName(input.managerId),
  ]);

  const progressByFather = new Map<string, typeof input.workspace.progress>();
  for (const row of input.workspace.progress) {
    const list = progressByFather.get(row.father_id) ?? [];
    list.push(row);
    progressByFather.set(row.father_id, list);
  }

  const groupsById = new Map(input.workspace.groups.map((group) => [group.id, group]));
  const fathers: NudgePanelFather[] = input.workspace.participants.map((participant) => ({
    fatherId: participant.fatherId,
    name: participant.name,
    groupLocale: groupsById.get(participant.groupId)?.locale ?? null,
    cards: input.workspace.trainingProgressFor(participant.fatherId),
    progress: progressByFather.get(participant.fatherId) ?? [],
    assignments: input.workspace.assignments.filter((row) => row.father_id === participant.fatherId),
    lastNudgeAt: recent.get(participant.fatherId) ?? null,
    reachability: reachability.get(participant.fatherId) ?? null,
  }));

  return buildNudgePanel({
    role: input.role,
    fathers,
    leaderFirstName: firstName,
    t: input.t,
    now,
  });
}

export async function loadNudgePanelFather(input: {
  managerId: string;
  fatherId: string;
  workspace: Workspace;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const participant = input.workspace.participants.find((row) => row.fatherId === input.fatherId);
  if (!participant) return null;
  const since = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * 86_400_000);
  const [recent, reachability, firstName] = await Promise.all([
    loadRecentEncouragements([input.fatherId], since),
    loadReachability([input.fatherId]),
    loadLeaderFirstName(input.managerId),
  ]);
  const group = input.workspace.groups.find((item) => item.id === participant.groupId);
  const father: NudgePanelFather = {
    fatherId: participant.fatherId,
    name: participant.name,
    groupLocale: group?.locale ?? null,
    cards: input.workspace.trainingProgressFor(participant.fatherId),
    progress: input.workspace.progress.filter((row) => row.father_id === participant.fatherId),
    assignments: input.workspace.assignments.filter((row) => row.father_id === participant.fatherId),
    lastNudgeAt: recent.get(participant.fatherId) ?? null,
    reachability: reachability.get(participant.fatherId) ?? null,
  };
  return { father, leaderFirstName: firstName, now };
}
