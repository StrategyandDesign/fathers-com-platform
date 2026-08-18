import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  closedWeekStart,
  countedWeekKeys,
  deriveCurrentStreak,
  deriveLongestStreak,
  lastCountedWeek,
  ledgerFromCountedWeeks,
  mondayWeekStart,
  resolveStreakTimeZone,
} from "../lib/father/streak";
import { isSessionComplete } from "../lib/father/types";

const SAMPLE_FATHERS = [
  "f831b751-79b3-4f3f-bbfe-68f4f7864043",
  "30b2de9a-a601-4c5b-9b3b-49971ebbb693",
  "afb84b2d-6d9c-40df-a580-90c7a63e77a2",
];

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Use the environment as-is.
  }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function membershipAt(admin: SupabaseClient, userId: string) {
  const [member, profile] = await Promise.all([
    admin
      .from("group_members")
      .select("joined_at")
      .eq("father_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
  ]);
  const dates = [member.data?.joined_at, profile.data?.created_at]
    .filter(Boolean)
    .map((value) => new Date(String(value)))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());
  return dates[0] ?? new Date();
}

async function backfillOne(admin: SupabaseClient, userId: string, now: Date) {
  const [progressRes, prefsRes] = await Promise.all([
    admin.from("session_progress").select("*").eq("father_id", userId),
    admin.from("notification_preferences").select("timezone").eq("user_id", userId).maybeSingle(),
  ]);
  if (progressRes.error) throw progressRes.error;
  const completedAt = (progressRes.data ?? [])
    .filter((row) => isSessionComplete(row) && row.completed_at)
    .map((row) => String(row.completed_at));
  const timezone = resolveStreakTimeZone(prefsRes.data?.timezone);
  const counted = [...countedWeekKeys(completedAt, timezone)].sort();
  const lastClosed = closedWeekStart(now, timezone);
  const joined = await membershipAt(admin, userId);

  const { error: upsertError } = await admin.from("father_streaks").upsert(
    {
      user_id: userId,
      current_streak_weeks: 0,
      longest_streak_weeks: 0,
      last_counted_week: null,
      last_evaluated_week: lastClosed,
      freezes_remaining: 2,
      freezes_last_replenished_at: joined.toISOString(),
      timezone,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (upsertError) throw upsertError;

  const { error: freezeError } = await admin
    .from("father_streaks")
    .update({
      freezes_remaining: 2,
      last_evaluated_week: lastClosed,
      timezone,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);
  if (freezeError) throw freezeError;

  for (const weekStart of counted) {
    const { error } = await admin.rpc("record_streak_week", {
      p_user_id: userId,
      p_week_start: weekStart,
      p_outcome: "counted",
    });
    if (error) throw error;
  }

  const ledger = ledgerFromCountedWeeks(counted);
  const currentMonday = mondayWeekStart(now, timezone);
  const currentWeeks = deriveCurrentStreak(ledger, currentMonday);
  const longestWeeks = deriveLongestStreak(ledger);
  const { error: cacheError } = await admin
    .from("father_streaks")
    .update({
      current_streak_weeks: currentWeeks,
      longest_streak_weeks: longestWeeks,
      last_counted_week: lastCountedWeek(ledger),
      last_evaluated_week: lastClosed,
      freezes_remaining: 2,
      timezone,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);
  if (cacheError) throw cacheError;

  return {
    userId,
    handWeeks: currentWeeks,
    storedWeeks: currentWeeks,
    longestWeeks,
    countedWeeks: counted,
    freezesRemaining: 2,
    timezone,
  };
}

async function main() {
  loadEnvLocal();
  const admin = adminClient();
  const now = new Date();
  const { data, error } = await admin.from("profiles").select("id").eq("role", "father");
  if (error) throw error;

  const results = [];
  for (const row of data ?? []) {
    results.push(await backfillOne(admin, row.id as string, now));
  }
  const byId = new Map(results.map((row) => [row.userId, row]));

  console.log(`Backfilled ${results.length} fathers.`);
  console.log("");
  console.log("Hand calculation vs stored cache (three sample fathers)");
  console.log("week = Monday-start local week. Two completions in one week count as 1.");
  console.log("");

  for (const userId of SAMPLE_FATHERS) {
    const row = byId.get(userId);
    if (!row) {
      console.log(`${userId}: not in father list`);
      continue;
    }
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData.user?.email ?? userId;
    const stored = await admin
      .from("father_streaks")
      .select("current_streak_weeks, longest_streak_weeks, freezes_remaining")
      .eq("user_id", userId)
      .maybeSingle();
    const storedWeeks = stored.data?.current_streak_weeks ?? null;
    const match = storedWeeks === row.handWeeks ? "MATCH" : "MISMATCH";
    console.log(email);
    console.log(`  timezone:      ${row.timezone}`);
    console.log(`  counted weeks: ${row.countedWeeks.join(", ") || "(none)"}`);
    console.log(`  hand current:  ${row.handWeeks}`);
    console.log(`  stored current:${storedWeeks}`);
    console.log(`  longest:       ${stored.data?.longest_streak_weeks ?? row.longestWeeks}`);
    console.log(`  freezes:       ${stored.data?.freezes_remaining ?? row.freezesRemaining}`);
    console.log(`  ${match}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
