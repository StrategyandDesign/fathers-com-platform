"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { loadNudgePanelFather } from "@/lib/manager/nudge-panel-data";
import {
  canReachFather,
  describeStall,
  encouragementPayload,
  nudgedWithinCooldown,
} from "@/lib/manager/nudge-panel";
import { queueLeaderEncouragement } from "@/lib/notifications/events";
import { encouragementHref } from "@/lib/notifications/next-session";
import { isInQuietHours, nextQuietEnd } from "@/lib/notifications/schedule";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type NudgePanelSendStatus = "sent" | "queued" | "cannot_reach" | "cooldown" | "failed";

export type NudgePanelSendResult = {
  fatherId: string;
  status: NudgePanelSendStatus;
  sentAt?: string;
};

async function writeDeliveryLog(input: {
  fatherId: string;
  status: "skipped_pref" | "skipped_channel" | "failed";
  href: string;
  title?: string;
  body?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("notification_deliveries").insert({
    user_id: input.fatherId,
    type: "leader_encouragement",
    channel: "email",
    status: input.status,
    dedupe_key: `encouragement:${input.fatherId}:${crypto.randomUUID()}`,
    href: input.href,
    title: input.title ?? null,
    body: input.body ?? null,
  });
  if (error) {
    console.error("[nudge-panel] delivery log failed", error.message);
  }
}

async function sendOne(input: {
  managerId: string;
  fatherId: string;
  workspace: Awaited<ReturnType<typeof loadManagerWorkspace>>;
}): Promise<NudgePanelSendResult> {
  const packed = await loadNudgePanelFather({
    managerId: input.managerId,
    fatherId: input.fatherId,
    workspace: input.workspace,
  });
  if (!packed) {
    return { fatherId: input.fatherId, status: "failed" };
  }

  const { father, leaderFirstName, now } = packed;
  const stall = describeStall(father, now);
  if (!stall) {
    return { fatherId: input.fatherId, status: "failed" };
  }
  if (nudgedWithinCooldown(father.lastNudgeAt, now)) {
    return { fatherId: input.fatherId, status: "cooldown", sentAt: father.lastNudgeAt ?? now.toISOString() };
  }

  const assigned = father.assignments
    .map((row) => {
      const training = input.workspace.trainings.find((item) => item.id === row.training_id);
      if (!training) return null;
      return { training, assignedAt: Date.parse(row.assigned_at ?? "") || 0 };
    })
    .filter((row): row is { training: (typeof father.cards)[number]["training"]; assignedAt: number } =>
      Boolean(row)
    );
  const href = encouragementHref({
    assigned,
    allTrainings: input.workspace.trainings,
    sessions: input.workspace.sessions,
    progress: father.progress,
  });
  const payload = encouragementPayload({
    tier: stall.tier,
    leaderFirstName,
    minutes: stall.minutes,
    completed: stall.currentCompleted,
    total: stall.currentTotal,
    trainingTitle: stall.trainingTitle,
  });

  if (!canReachFather(father.reachability)) {
    await writeDeliveryLog({
      fatherId: father.fatherId,
      status: father.reachability && !father.reachability.leaderEncouragement ? "skipped_pref" : "skipped_channel",
      href,
    });
    return { fatherId: father.fatherId, status: "cannot_reach" };
  }

  const reach = father.reachability;
  const inQuiet = reach
    ? isInQuietHours(now, reach.timezone, reach.quietHoursStart, reach.quietHoursEnd)
    : false;
  const availableAt = inQuiet && reach ? nextQuietEnd(now, reach.timezone, reach.quietHoursEnd) : now;
  const sentAt = new Date().toISOString();
  const nudgeId = crypto.randomUUID();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("manager_nudges").insert({
      father_id: father.fatherId,
      manager_id: input.managerId,
      template_key: "encouragement",
      status: "sent",
    });
    if (error) {
      console.error("[nudge-panel] nudge log failed", error.message);
      await writeDeliveryLog({ fatherId: father.fatherId, status: "failed", href });
      return { fatherId: father.fatherId, status: "failed" };
    }

    await queueLeaderEncouragement({
      fatherId: father.fatherId,
      nudgeId,
      href,
      payload: { ...payload, sessionId: stall.card.current?.session.id },
      availableAt,
    });
  } catch (error) {
    console.error("[nudge-panel] send failed", error);
    await writeDeliveryLog({ fatherId: father.fatherId, status: "failed", href });
    return { fatherId: father.fatherId, status: "failed" };
  }

  return {
    fatherId: father.fatherId,
    status: inQuiet ? "queued" : "sent",
    sentAt,
  };
}

export async function sendNudgePanelNotes(fatherIds: string[]): Promise<{
  ok: boolean;
  error?: string;
  results: NudgePanelSendResult[];
}> {
  const { user } = await requireRole("manager");
  const unique = [...new Set(fatherIds.map((id) => String(id ?? "").trim()).filter(Boolean))].slice(0, 10);
  if (unique.length === 0) {
    return { ok: false, error: "Choose someone to send to.", results: [] };
  }
  if (!(await allowActionRateLimit("manager.nudge"))) {
    return {
      ok: false,
      error: "Too many notes just now. Try again in a few minutes.",
      results: [],
    };
  }

  const workspace = await loadManagerWorkspace(user.id);
  const results: NudgePanelSendResult[] = [];
  for (const fatherId of unique) {
    results.push(await sendOne({ managerId: user.id, fatherId, workspace }));
  }

  revalidatePath("/manager");
  revalidatePath("/manager/participants");
  return { ok: true, results };
}
