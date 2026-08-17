import { redirect } from "next/navigation";

import { ROLE_HOME, resolveRole, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null as AppRole | null };
  }

  return { user, role: resolveRole(user) };
}

export async function requireRole(allowed: AppRole) {
  const { user, role } = await getAuthContext();

  if (!user || !role) {
    redirect("/login");
  }

  if (role !== allowed) {
    redirect(ROLE_HOME[role]);
  }

  return { user, role };
}
