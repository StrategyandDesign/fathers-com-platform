import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NudgeLogRow } from "@/lib/manager/nudges";

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
    pref_key: "leader_encouragement",
  });
  if (error) {
    console.error("[nudges] reminder pref lookup failed", error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean } | null;
  if (!row) return null;
  return Boolean(row.allowed);
}
