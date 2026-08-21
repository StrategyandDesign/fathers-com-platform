"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadAdminUsers } from "@/lib/admin/data";
import { notifyLeaderInvite, notifyOrganizationReady } from "@/lib/email/events";
import { getAppUrl } from "@/lib/email/send";
import { getAuthContext, requireRole } from "@/lib/auth/session";
import {
  createManagerInviteToken,
  isInviteEmail,
  managerInviteExpiresAt,
  managerJoinHref,
  normalizeInviteEmail,
} from "@/lib/manager/invite";
import { isManagerOfGroup } from "@/lib/org-staff/membership";
import { canRemoveStaff, isOrganizationStaffRole } from "@/lib/org-staff/types";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateStaff(groupId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/account");
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath("/reviewer");
  revalidatePath("/father");
  if (groupId) revalidatePath(`/admin/organizations/${groupId}`);
}

async function requireStaffEditor(groupId: string, path: string) {
  const { user, role } = await getAuthContext();
  if (!user) redirect("/login");
  if (!(await allowActionRateLimit("org.staff"))) {
    fail(path, "flash.tooMany");
  }
  const supabase = await createClient();
  if (role === "admin") return { user, role, supabase };
  if (role !== "manager") fail(path, "You cannot change this desk.");
  if (!(await isManagerOfGroup(supabase, user.id, groupId))) {
    fail(path, "That group is not yours.");
  }
  return { user, role, supabase };
}

export async function addOrganizationStaff(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const staffRole = String(formData.get("staff_role") ?? "").trim();
  const path = String(formData.get("return_to") ?? "").trim() || `/admin/organizations/${groupId}`;

  if (!groupId) fail(path, "Choose an organization.");
  if (!profileId) fail(path, "Choose a person.");
  if (!isOrganizationStaffRole(staffRole)) fail(path, "Choose Leader or Reviewer.");

  const { user, supabase } = await requireStaffEditor(groupId, path);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, deactivated_at")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError || !profile) fail(path, "That person was not found.");
  if (profile.deactivated_at) fail(path, "That account is deactivated.");
  if (profile.role !== staffRole) {
    fail(
      path,
      staffRole === "manager"
        ? "That user is not a Leader. Change their role first."
        : "That user is not a Reviewer. Change their role first."
    );
  }

  const { error } = await supabase.from("organization_staff").insert({
    group_id: groupId,
    profile_id: profileId,
    staff_role: staffRole,
    added_by: user.id,
  });
  if (error) {
    if (error.code === "23505") fail(path, "They are already on this organization.");
    fail(path, error.message);
  }

  revalidateStaff(groupId);
  ok(path, staffRole === "manager" ? "Leader added to this organization." : "Reviewer added to this organization.");
}

export async function removeOrganizationStaff(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const path = String(formData.get("return_to") ?? "").trim() || `/admin/organizations/${groupId}`;

  if (!groupId || !profileId) fail(path, "Choose a person to remove.");

  const { supabase } = await requireStaffEditor(groupId, path);
  const { data: staff, error: staffError } = await supabase
    .from("organization_staff")
    .select("profile_id, staff_role")
    .eq("group_id", groupId);
  if (staffError) fail(path, staffError.message);

  const rows = (staff ?? []) as Array<{ profile_id: string; staff_role: string }>;
  const target = rows.find((row) => row.profile_id === profileId);
  if (!target || !isOrganizationStaffRole(target.staff_role)) {
    fail(path, "They are not on this organization.");
  }
  const managerCount = rows.filter((row) => row.staff_role === "manager").length;
  if (!canRemoveStaff({ targetId: profileId, targetRole: target.staff_role, managerCount })) {
    fail(path, "Keep at least one leader on the organization.");
  }

  const { error } = await supabase
    .from("organization_staff")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", profileId);
  if (error) fail(path, error.message);

  revalidateStaff(groupId);
  ok(path, "Removed from this organization.");
}

export async function inviteOrganizationLeader(formData: FormData) {
  const { user } = await requireRole("admin");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const email = normalizeInviteEmail(formData.get("email"));
  const fullName = String(formData.get("full_name") ?? "").trim() || null;
  const path = groupId ? `/admin/organizations/${groupId}` : "/admin/organizations";

  if (!groupId) fail("/admin/organizations", "Choose an organization.");
  if (fullName && fullName.length > 80) fail(path, "Keep the name under 80 characters.");
  if (!(await allowActionRateLimit("org.staff"))) fail(path, "flash.tooMany");
  if (!isInviteEmail(email)) fail(path, "Enter the leader’s email.");

  const supabase = await createClient();
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .maybeSingle();
  if (groupError || !group) fail(path, "That organization was not found.");

  const directory = await loadAdminUsers();
  const matched = directory.find((row) => row.email?.toLowerCase() === email);
  if (matched) {
    if (matched.role !== "manager") {
      fail(path, "That email already belongs to another role. Use a different email.");
    }
    if (matched.deactivated_at) fail(path, "That leader is deactivated.");
    const { error } = await supabase.from("organization_staff").insert({
      group_id: groupId,
      profile_id: matched.id,
      staff_role: "manager",
      added_by: user.id,
    });
    if (error) {
      if (error.code === "23505") fail(path, "They are already on this organization.");
      fail(path, error.message);
    }
    if (matched.email) {
      await notifyOrganizationReady({
        email: matched.email,
        organizationName: group.name,
      });
    }
    revalidateStaff(groupId);
    ok(path, "Leader added to this organization.");
  }

  const token = createManagerInviteToken();
  const { error } = await supabase.from("manager_invites").insert({
    token_hash: token.hash,
    email,
    full_name: fullName,
    organization_name: group.name,
    group_id: groupId,
    invited_by: user.id,
    expires_at: managerInviteExpiresAt().toISOString(),
  });
  if (error) {
    if (error.code === "23505") fail(path, "An invite is already open for that email.");
    fail(path, error.message);
  }

  const mailed = await notifyLeaderInvite({
    email,
    organizationName: group.name,
    joinHref: managerJoinHref(token.token, getAppUrl()),
  });
  revalidateStaff(groupId);
  revalidatePath("/admin/support/leaders");
  ok(
    path,
    mailed.sent
      ? "Invite sent. They will join this organization as a leader."
      : "Invite saved. Email did not send. Open Inbox to send it again."
  );
}
