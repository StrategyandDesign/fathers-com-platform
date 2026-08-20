import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  asManagerInvite,
  hashManagerInviteToken,
  isManagerInviteOpen,
  type ManagerInviteRow,
} from "@/lib/manager/invite";

export async function loadOpenManagerInvite(token: string): Promise<ManagerInviteRow | null> {
  const admin = createAdminClient();
  if (!admin || !token.trim()) return null;
  const { data, error } = await admin
    .from("manager_invites")
    .select(
      "id, email, full_name, organization_name, group_id, accepted_at, expires_at, created_at"
    )
    .eq("token_hash", hashManagerInviteToken(token))
    .maybeSingle();
  if (error || !data) return null;
  const invite = asManagerInvite(data as Record<string, unknown>);
  if (!invite || !isManagerInviteOpen(invite)) return null;
  return invite;
}
