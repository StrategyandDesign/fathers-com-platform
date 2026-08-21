"use server";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function finishManagerOnboarding() {
  const { user } = await requireRole("manager");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ manager_onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    redirect(`/manager/start?error=${encodeURIComponent("That didn’t save. Try again.")}`);
  }

  redirect("/manager");
}
