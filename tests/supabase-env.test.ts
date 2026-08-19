import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("supabase env fallback", () => {
  it("ignores the .env.example placeholder host", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
    const { getSupabaseUrl } = await import("../lib/supabase/env");
    assert.equal(getSupabaseUrl(), "https://koeplcybddrvbliuepsy.supabase.co");
  });
});
