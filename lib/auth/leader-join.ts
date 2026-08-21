"use server";

import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/auth/roles";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  asManagerInvite,
  hashManagerInviteToken,
  isManagerInviteOpen,
} from "@/lib/manager/invite";

function joinPath(token: string, message: string): never {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("error", message);
  redirect(`/join/leader?${params.toString()}`);
}

export async function joinAsLeader(formData: FormData) {
  if (!(await allowActionRateLimit("auth.leader_join"))) {
    redirect(`/join/leader?error=${encodeURIComponent("Too many attempts. Wait a few minutes and try again.")}`);
  }

  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!token) {
    joinPath("", "That invite is no longer open.");
  }
  if (!fullName) {
    joinPath(token, "Enter your name.");
  }
  if (fullName.length > 80) {
    joinPath(token, "Keep the name under 80 characters.");
  }
  if (password.length < 6) {
    joinPath(token, "Use a password with at least 6 characters.");
  }

  const admin = createAdminClient();
  if (!admin) {
    joinPath(token, "This desk cannot create the account right now.");
  }

  const { data, error } = await admin
    .from("manager_invites")
    .select(
      "id, email, full_name, organization_name, group_id, accepted_at, expires_at, created_at"
    )
    .eq("token_hash", hashManagerInviteToken(token))
    .maybeSingle();

  if (error) joinPath(token, "That invite is no longer open.");
  const invite = data ? asManagerInvite(data as Record<string, unknown>) : null;
  if (!invite || !isManagerInviteOpen(invite)) {
    joinPath(token, "That invite is no longer open.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role: "manager" },
  });

  if (createError || !created.user) {
    const text = (createError?.message ?? "").toLowerCase();
    if (text.includes("already") || text.includes("registered") || text.includes("exists")) {
      joinPath(token, "An account with that email already exists. Sign in instead.");
    }
    joinPath(token, "Couldn’t create the account. Try again.");
  }

  const userId = created.user.id;
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role: "manager",
      full_name: fullName,
      manager_onboarded_at: null,
    })
    .eq("id", userId);
  if (profileError) {
    joinPath(token, "The account was created, but the desk is not ready. Ask a Super-admin.");
  }

  let groupId = invite.groupId;
  if (groupId) {
    const { data: existingGroup } = await admin
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .maybeSingle();
    if (!existingGroup?.id) {
      joinPath(token, "That organization is no longer open. Ask a Super-admin.");
    }
    const { error: staffError } = await admin.from("organization_staff").insert({
      group_id: groupId,
      profile_id: userId,
      staff_role: "manager",
      added_by: userId,
    });
    if (staffError && staffError.code !== "23505") {
      joinPath(token, "The account was created, but the desk is not ready. Ask a Super-admin.");
    }
  } else {
    const { data: group } = await admin
      .from("groups")
      .insert({
        name: invite.organizationName,
        manager_id: userId,
      })
      .select("id")
      .single();
    groupId = group?.id ?? null;
    if (groupId) {
      await admin.rpc("seed_group_training_reviews", { p_group_id: groupId });
      await admin.rpc("seed_group_assessment_reviews", { p_group_id: groupId });
    }
  }

  await admin
    .from("manager_invites")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
      group_id: groupId,
      full_name: fullName,
    })
    .eq("id", invite.id);

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInError) {
    redirect(
      `/login?notice=${encodeURIComponent("Your Leader account is ready. Sign in with your email and password.")}`
    );
  }

  redirect(ROLE_HOME.manager);
}
