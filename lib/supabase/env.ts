// Public Pilot project credentials. Safe in the browser (same class as the
// anon key the old static site shipped in assets/js/config.js). Used when
// Vercel Production has no NEXT_PUBLIC_SUPABASE_* vars, which 500'd `/`,
// `/father`, `/manager`, and `/admin` after the clean-pilot ship.
const PILOT_SUPABASE_URL = "https://koeplcybddrvbliuepsy.supabase.co";
const PILOT_PUBLISHABLE_KEY = "sb_publishable_-iD7cLP_O0_1PhIvl5xEgw_LUi5f24U";
const PILOT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZXBsY3liZGRydmJsaXVlcHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjYwODgsImV4cCI6MjEwMjUwMjA4OH0.qlHaBR9tYsdSebzjVVql0on9B0vihZjIf36_JA4bLMM";

function configuredSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!raw) return "";
  if (/your-project/i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return raw;
  } catch {
    return "";
  }
}

export function getSupabaseUrl() {
  return configuredSupabaseUrl() || PILOT_SUPABASE_URL;
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    PILOT_PUBLISHABLE_KEY ||
    PILOT_ANON_KEY
  );
}
