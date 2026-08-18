import "server-only";

import {
  clampFreezes,
  mondayWeekStart,
  resolveStreakTimeZone,
  streakGridWeeks,
  type FatherStreakNotice,
  type LedgerOutcome,
  type StreakNoticeKind,
} from "@/lib/father/streak";
import {
  asLedgerOutcome,
  asStreakNoticeKind,
  streakDateKey,
  syncFatherStreak,
} from "@/lib/father/streak-admin";
import { createClient } from "@/lib/supabase/server";

export type { FatherStreakNotice, StreakNoticeKind };
export {
  backfillFatherStreaks,
  evaluateClosedStreaks,
  recordSessionCompletionForStreak,
  syncFatherStreak,
} from "@/lib/father/streak-admin";

export type FatherStreakHome = {
  currentWeeks: number;
  longestWeeks: number;
  freezesRemaining: number;
  grid: Array<{ weekStart: string; outcome: LedgerOutcome | null }>;
  notices: FatherStreakNotice[];
};

type StreakRow = {
  current_streak_weeks: number;
  longest_streak_weeks: number;
  freezes_remaining: number;
  timezone: string;
};

type LedgerRow = {
  week_start: string;
  outcome: LedgerOutcome;
};

type NoticeRow = {
  id: string;
  kind: StreakNoticeKind;
  week_start: string | null;
  payload: FatherStreakNotice["payload"] | null;
  created_at: string;
};

export async function loadFatherStreakHome(fatherId: string, now = new Date()): Promise<FatherStreakHome> {
  try {
    await syncFatherStreak(fatherId, now);
  } catch (error) {
    console.error("[streak] sync failed", error);
  }

  const supabase = await createClient();
  const [{ data: streak, error: streakError }, { data: ledger, error: ledgerError }, { data: notices, error: noticeError }] =
    await Promise.all([
      supabase.from("father_streaks").select("*").eq("user_id", fatherId).maybeSingle(),
      supabase
        .from("streak_week_ledger")
        .select("user_id, week_start, outcome")
        .eq("user_id", fatherId),
      supabase
        .from("father_streak_notices")
        .select("id, kind, week_start, payload, created_at")
        .eq("user_id", fatherId)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false }),
    ]);

  if (streakError) throw streakError;
  if (ledgerError) throw ledgerError;
  if (noticeError) throw noticeError;

  const timezone = resolveStreakTimeZone((streak as StreakRow | null)?.timezone);
  const currentMonday = mondayWeekStart(now, timezone);
  const byWeek = new Map<string, LedgerOutcome>();
  for (const row of (ledger ?? []) as LedgerRow[]) {
    const outcome = asLedgerOutcome(row.outcome);
    const weekStart = streakDateKey(row.week_start);
    if (!outcome || !weekStart) continue;
    byWeek.set(weekStart, outcome);
  }

  return {
    currentWeeks: (streak as StreakRow | null)?.current_streak_weeks ?? 0,
    longestWeeks: (streak as StreakRow | null)?.longest_streak_weeks ?? 0,
    freezesRemaining: clampFreezes((streak as StreakRow | null)?.freezes_remaining ?? 0),
    grid: streakGridWeeks(currentMonday).map((weekStart) => ({
      weekStart,
      outcome: byWeek.get(weekStart) ?? null,
    })),
    notices: ((notices ?? []) as NoticeRow[])
      .map((row) => {
        const kind = asStreakNoticeKind(row.kind);
        if (!kind) return null;
        const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
        return {
          id: row.id,
          kind,
          weekStart: streakDateKey(row.week_start),
          payload,
          createdAt: row.created_at,
        };
      })
      .filter((row): row is FatherStreakNotice => Boolean(row)),
  };
}

export async function dismissStreakNoticeForUser(fatherId: string, noticeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("father_streak_notices")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", noticeId)
    .eq("user_id", fatherId)
    .is("dismissed_at", null);
  if (error) throw error;
}
