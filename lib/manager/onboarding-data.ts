import { createClient } from "@/lib/supabase/server";

export async function loadManagerOnboardedAt(managerId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("manager_onboarded_at")
      .eq("id", managerId)
      .maybeSingle();
    if (error) return new Date().toISOString();
    return typeof data?.manager_onboarded_at === "string" ? data.manager_onboarded_at : null;
  } catch {
    return new Date().toISOString();
  }
}
