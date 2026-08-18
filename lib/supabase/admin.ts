import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/supabase/env";

export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || null;
}

export function createAdminClient() {
  const key = getServiceRoleKey();
  if (!key) return null;
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
