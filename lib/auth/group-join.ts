import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/** Join the invite-code group if this father is not in one yet. */
export async function ensureFatherGroupJoin(user: User) {
  const invite = user.user_metadata?.invite_code;
  if (typeof invite !== "string" || !invite.trim()) return;

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("father_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("[auth] group membership lookup failed", membershipError.message);
    return;
  }
  if (membership) return;

  const { error } = await supabase.rpc("join_group_with_invite_code", {
    invite_code: invite.trim(),
  });
  if (error) {
    console.error("[auth] group join retry failed", error.message);
  }
}
