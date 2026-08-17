"use server";

import { redirect } from "next/navigation";

import { notifyAccountCreated } from "@/lib/email/events";
import { ROLE_HOME, resolveRole, safeInternalPath } from "@/lib/auth/roles";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  if (!(await allowActionRateLimit("auth.signin"))) {
    redirect(`/login?error=${encodeURIComponent("Too many attempts. Wait a few minutes and try again.")}`);
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeInternalPath(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Sign in failed")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("deactivated_at")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.deactivated_at) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("This account has been deactivated.")}`);
  }

  redirect(next ?? ROLE_HOME[resolveRole(data.user)]);
}

export async function signUp(formData: FormData) {
  if (!(await allowActionRateLimit("auth.signup"))) {
    redirect(`/signup?error=${encodeURIComponent("Too many attempts. Wait a few minutes and try again.")}`);
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  if (!inviteCode) {
    redirect(`/signup?error=${encodeURIComponent("Invite code is required")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { invite_code: inviteCode } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    await notifyAccountCreated({ email, userId: data.user?.id });
    redirect(
      `/login?notice=${encodeURIComponent("Check your email to confirm your account, then sign in with your invite code.")}`
    );
  }

  const { error: joinError } = await supabase.rpc("join_group_with_invite_code", {
    invite_code: inviteCode,
  });

  if (joinError) {
    redirect(`/signup?error=${encodeURIComponent(joinError.message)}`);
  }

  await notifyAccountCreated({ email, userId: data.user?.id });
  redirect(ROLE_HOME.father);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
