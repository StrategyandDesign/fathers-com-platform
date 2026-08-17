"use server";

import { redirect } from "next/navigation";

import { notifyAccountCreated } from "@/lib/email/events";
import { ensureFatherGroupJoin } from "@/lib/auth/group-join";
import { ROLE_HOME, resolveRole, safeInternalPath } from "@/lib/auth/roles";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

function signInFlash(message?: string) {
  const text = (message ?? "").toLowerCase();
  if (text.includes("deactivated")) {
    return "This account has been deactivated.";
  }
  if (text.includes("too many")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (text.includes("confirm")) {
    return "Confirm your email first, then sign in.";
  }
  return "Email or password doesn’t match. Try again, or create an account if you don’t have one.";
}

function signUpFlash(message: string) {
  const text = message.toLowerCase();
  if (text.includes("too many")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (text.includes("invite") || text.includes("not signed in")) {
    return "That invite code didn’t work. Check it with your manager and try again.";
  }
  if (text.includes("already") || text.includes("registered") || text.includes("exists")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (text.includes("password")) {
    return "Use a password with at least 6 characters.";
  }
  if (text.includes("email") && (text.includes("invalid") || text.includes("valid"))) {
    return "Enter a valid email address.";
  }
  return "Couldn’t create the account. Check the invite code and try again.";
}

export async function signIn(formData: FormData) {
  if (!(await allowActionRateLimit("auth.signin"))) {
    redirect(`/login?error=${encodeURIComponent("Too many attempts. Wait a few minutes and try again.")}`);
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const next = safeInternalPath(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(signInFlash(error?.message))}`);
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

  if (resolveRole(data.user) === "father") {
    await ensureFatherGroupJoin(data.user);
  }

  try {
    const { resolveUserLocale } = await import("@/lib/i18n/resolve");
    const { writeLocaleCookie } = await import("@/lib/i18n/cookie");
    const resolved = await resolveUserLocale(data.user.id);
    await writeLocaleCookie(resolved.locale);
  } catch {
    // Locale cookie is best-effort; sign-in still proceeds.
  }

  redirect(next ?? ROLE_HOME[resolveRole(data.user)]);
}

export async function signUp(formData: FormData) {
  if (!(await allowActionRateLimit("auth.signup"))) {
    redirect(`/signup?error=${encodeURIComponent("Too many attempts. Wait a few minutes and try again.")}`);
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  if (!inviteCode) {
    redirect(
      `/signup?error=${encodeURIComponent("Ask your manager for an invite code, then try again.")}`
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { invite_code: inviteCode } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(signUpFlash(error.message))}`);
  }

  if (!data.session) {
    await notifyAccountCreated({ email, userId: data.user?.id });
    redirect(
      `/login?notice=${encodeURIComponent("Check your email to confirm your account, then sign in with your email and password.")}`
    );
  }

  const { error: joinError } = await supabase.rpc("join_group_with_invite_code", {
    invite_code: inviteCode,
  });

  if (joinError) {
    redirect(`/signup?error=${encodeURIComponent(signUpFlash(joinError.message))}`);
  }

  await notifyAccountCreated({ email, userId: data.user?.id });
  redirect(ROLE_HOME.father);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
