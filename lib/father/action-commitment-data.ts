import "server-only";

import { asActionCommitment, type ActionCommitment } from "@/lib/father/action-commitment";
import { parseTimeZone } from "@/lib/notifications/schedule";
import { createClient } from "@/lib/supabase/server";

export async function loadActionCommitment(
  userId: string,
  sessionId: string
): Promise<ActionCommitment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("action_commitments")
    .select(
      "session_id, user_id, intention_label, intention_at, committed_at, completed_at, closed_at, outcome_note"
    )
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return asActionCommitment(data);
}

export async function loadFatherTimeZone(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();
  return parseTimeZone(data?.timezone) ?? "UTC";
}
