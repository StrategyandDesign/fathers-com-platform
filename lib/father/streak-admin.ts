import {
  closedWeekStart,
  closedWeeksToEvaluate,
  completionCountsForWeek,
  countedWeekKeys,
  deriveCurrentStreak,
  deriveLongestStreak,
  evaluateClosedWeek,
  hadAssignedOpenSession,
  lastCountedWeek,
  ledgerFromCountedWeeks,
  mondayWeekStart,
  replenishFreezes,
  resolveStreakTimeZone,
  weekEndUtc,
  type FatherStreakNotice,
  type LedgerOutcome,
  type StreakAssignmentFact,
  type StreakNoticeKind,
  type StreakSessionFact,
  type StreakTrainingFact,
} from "@/lib/father/streak";
import { isSessionComplete, type Session, type SessionProgress, type Training } from "@/lib/father/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

type StreakRow = {
  user_id: string;
  current_streak_weeks: number;
  longest_streak_weeks: number;
  last_counted_week: string | null;
  last_evaluated_week: string | null;
  freezes_remaining: number;
  freezes_last_replenished_at: string;
  timezone: string;
};

type CatalogFacts = {
  trainings: StreakTrainingFact[];
  assignments: StreakAssignmentFact[];
  sessions: StreakSessionFact[];
  completedAt: string[];
  timezone: string;
  membershipAt: Date;
  lifetimeSessions: number;
  lifetimeCertificates: number;
};

export type BackfillStreakResult = {
  userId: string;
  handWeeks: number;
  storedWeeks: number;
  longestWeeks: number;
  countedWeeks: string[];
  freezesRemaining: number;
};

function adminOrThrow() {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("missing_service_role");
  }
  return admin;
}

export function asLedgerOutcome(value: unknown): LedgerOutcome | null {
  if (value === "counted" || value === "frozen" || value === "missed" || value === "neutral") {
    return value;
  }
  return null;
}

export function asStreakNoticeKind(value: unknown): StreakNoticeKind | null {
  if (value === "freeze_consumed" || value === "reset" || value === "freeze_replenished") {
    return value;
  }
  return null;
}

export function streakDateKey(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 10);
}

export async function syncFatherStreak(fatherId: string, now = new Date()) {
  const admin = adminOrThrow();
  return syncFatherStreakWithClient(admin, fatherId, now);
}

export async function recordSessionCompletionForStreak(fatherId: string, now = new Date()) {
  const admin = adminOrThrow();
  await syncFatherStreakWithClient(admin, fatherId, now);
  const facts = await loadCatalogFacts(admin, fatherId);
  const weekStart = mondayWeekStart(now, facts.timezone);
  await recordLedgerOutcome(admin, fatherId, weekStart, "counted");
  await refreshStreakCache(admin, fatherId, facts.timezone, now);
}

export async function evaluateClosedStreaks(now = new Date()) {
  const admin = createAdminClient();
  if (!admin) return { ok: false as const, reason: "missing_service_role" };

  const { data, error } = await admin.from("profiles").select("id").eq("role", "father");
  if (error) throw error;

  let evaluated = 0;
  let written = 0;
  for (const row of data ?? []) {
    const result = await syncFatherStreakWithClient(admin, row.id as string, now);
    evaluated += 1;
    written += result.written;
  }
  return { ok: true as const, evaluated, written };
}

export async function backfillFatherStreaks(now = new Date()): Promise<BackfillStreakResult[]> {
  const admin = adminOrThrow();
  const { data, error } = await admin.from("profiles").select("id").eq("role", "father");
  if (error) throw error;

  const results: BackfillStreakResult[] = [];
  for (const row of data ?? []) {
    const userId = row.id as string;
    const facts = await loadCatalogFacts(admin, userId);
    const counted = [...countedWeekKeys(facts.completedAt, facts.timezone)].sort();
    const lastClosed = closedWeekStart(now, facts.timezone);
    await ensureStreakRow(admin, userId, facts, now, {
      lastEvaluatedWeek: lastClosed,
      grantFreezes: true,
    });
    for (const weekStart of counted) {
      await recordLedgerOutcome(admin, userId, weekStart, "counted");
    }
    const cache = await refreshStreakCache(admin, userId, facts.timezone, now);
    const hand = deriveCurrentStreak(
      ledgerFromCountedWeeks(counted),
      mondayWeekStart(now, facts.timezone)
    );
    results.push({
      userId,
      handWeeks: hand,
      storedWeeks: cache.currentWeeks,
      longestWeeks: cache.longestWeeks,
      countedWeeks: counted,
      freezesRemaining: 2,
    });
  }
  return results;
}

async function syncFatherStreakWithClient(admin: AdminClient, fatherId: string, now: Date) {
  const facts = await loadCatalogFacts(admin, fatherId);
  const row = await ensureStreakRow(admin, fatherId, facts, now);
  const replenished = await applyReplenish(admin, fatherId, row, facts.membershipAt, now);
  const timezone = facts.timezone;
  const timezoneChanged = resolveStreakTimeZone(row.timezone) !== timezone;
  const weeks = closedWeeksToEvaluate({
    now,
    timeZone: timezone,
    lastEvaluatedWeek: streakDateKey(row.last_evaluated_week),
  });

  let written = 0;
  let freezesRemaining = replenished.freezesRemaining;
  const { data: ledgerRows, error: ledgerError } = await admin
    .from("streak_week_ledger")
    .select("week_start, outcome")
    .eq("user_id", fatherId);
  if (ledgerError) throw ledgerError;
  const recorded = new Map<string, LedgerOutcome>();
  for (const item of ledgerRows ?? []) {
    const outcome = asLedgerOutcome(item.outcome);
    const weekStart = streakDateKey(item.week_start as string);
    if (outcome && weekStart) recorded.set(weekStart, outcome);
  }

  for (const weekStart of weeks) {
    const result = evaluateClosedWeek({
      alreadyRecorded: recorded.get(weekStart) ?? null,
      completedInWeek: completionCountsForWeek(facts.completedAt, weekStart, timezone),
      hadAssignedOpenSession: hadAssignedOpenSession({
        weekEnd: weekEndUtc(weekStart, timezone),
        trainings: facts.trainings,
        assignments: facts.assignments,
        sessions: facts.sessions,
      }),
      freezesRemaining,
      timezoneChanged,
    });
    if (result.kind === "noop") continue;
    const inserted = await recordLedgerOutcome(admin, fatherId, weekStart, result.kind);
    if (!inserted) continue;
    written += 1;
    recorded.set(weekStart, result.kind);
    if (result.kind === "frozen") {
      freezesRemaining = result.freezesRemaining;
      await insertNotice(admin, {
        userId: fatherId,
        kind: "freeze_consumed",
        weekStart,
        payload: { freezesRemaining },
      });
    }
    if (result.kind === "missed") {
      await insertNotice(admin, {
        userId: fatherId,
        kind: "reset",
        weekStart,
        payload: {
          sessions: facts.lifetimeSessions,
          certificates: facts.lifetimeCertificates,
        },
      });
    }
  }

  const lastClosed = closedWeekStart(now, timezone);
  await admin
    .from("father_streaks")
    .update({
      last_evaluated_week: lastClosed,
      timezone,
      freezes_remaining: freezesRemaining,
      freezes_last_replenished_at: replenished.lastReplenishedAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", fatherId);

  await refreshStreakCache(admin, fatherId, timezone, now);
  return { written, freezesRemaining };
}

async function applyReplenish(
  admin: AdminClient,
  fatherId: string,
  row: StreakRow,
  membershipAt: Date,
  now: Date
) {
  const lastReplenishedAt = new Date(row.freezes_last_replenished_at);
  const start = Number.isNaN(lastReplenishedAt.getTime()) ? membershipAt : lastReplenishedAt;
  const result = replenishFreezes({
    freezesRemaining: row.freezes_remaining,
    lastReplenishedAt: start < membershipAt ? membershipAt : start,
    now,
  });
  if (result.gained > 0) {
    await insertNotice(admin, {
      userId: fatherId,
      kind: "freeze_replenished",
      weekStart: null,
      payload: { freezesRemaining: result.freezesRemaining },
    });
  }
  return result;
}

async function ensureStreakRow(
  admin: AdminClient,
  fatherId: string,
  facts: CatalogFacts,
  now: Date,
  options?: { lastEvaluatedWeek?: string; grantFreezes?: boolean }
) {
  const { data, error } = await admin.from("father_streaks").select("*").eq("user_id", fatherId).maybeSingle();
  if (error) throw error;
  if (data) {
    const row = data as StreakRow;
    const patch: Record<string, unknown> = {};
    if (options?.grantFreezes) patch.freezes_remaining = 2;
    if (options?.lastEvaluatedWeek) patch.last_evaluated_week = options.lastEvaluatedWeek;
    if (Object.keys(patch).length === 0) return row;
    patch.updated_at = now.toISOString();
    const { data: updated, error: updateError } = await admin
      .from("father_streaks")
      .update(patch)
      .eq("user_id", fatherId)
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    return (updated as StreakRow) ?? ({ ...row, ...patch } as StreakRow);
  }

  const lastClosed = options?.lastEvaluatedWeek ?? closedWeekStart(now, facts.timezone);
  const insert = {
    user_id: fatherId,
    current_streak_weeks: 0,
    longest_streak_weeks: 0,
    last_counted_week: null,
    last_evaluated_week: lastClosed,
    freezes_remaining: 2,
    freezes_last_replenished_at: facts.membershipAt.toISOString(),
    timezone: facts.timezone,
    updated_at: now.toISOString(),
  };
  const { data: created, error: insertError } = await admin
    .from("father_streaks")
    .upsert(insert, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  if (insertError) throw insertError;
  return (created as StreakRow) ?? (insert as StreakRow);
}

async function recordLedgerOutcome(
  admin: AdminClient,
  fatherId: string,
  weekStart: string,
  outcome: LedgerOutcome
) {
  const { data, error } = await admin.rpc("record_streak_week", {
    p_user_id: fatherId,
    p_week_start: weekStart,
    p_outcome: outcome,
  });
  if (error) throw error;
  return data === true;
}

async function refreshStreakCache(
  admin: AdminClient,
  fatherId: string,
  timeZone: string,
  now: Date,
  existing?: StreakRow
) {
  const { data, error } = await admin
    .from("streak_week_ledger")
    .select("week_start, outcome")
    .eq("user_id", fatherId);
  if (error) throw error;
  const weeks = new Map<string, LedgerOutcome>();
  for (const row of data ?? []) {
    const outcome = asLedgerOutcome(row.outcome);
    const weekStart = streakDateKey(row.week_start as string);
    if (outcome && weekStart) weeks.set(weekStart, outcome);
  }
  const currentMonday = mondayWeekStart(now, timeZone);
  const currentWeeks = deriveCurrentStreak(weeks, currentMonday);
  const longestWeeks = Math.max(existing?.longest_streak_weeks ?? 0, deriveLongestStreak(weeks));
  const patch = {
    current_streak_weeks: currentWeeks,
    longest_streak_weeks: longestWeeks,
    last_counted_week: lastCountedWeek(weeks),
    timezone: timeZone,
    updated_at: now.toISOString(),
  };
  const { error: updateError } = await admin.from("father_streaks").update(patch).eq("user_id", fatherId);
  if (updateError) throw updateError;
  return { currentWeeks, longestWeeks };
}

async function insertNotice(
  admin: AdminClient,
  input: {
    userId: string;
    kind: StreakNoticeKind;
    weekStart: string | null;
    payload: FatherStreakNotice["payload"];
  }
) {
  const { error } = await admin.from("father_streak_notices").insert({
    user_id: input.userId,
    kind: input.kind,
    week_start: input.weekStart,
    payload: input.payload,
  });
  if (error && error.code !== "23505") throw error;
}

async function loadCatalogFacts(admin: AdminClient, fatherId: string): Promise<CatalogFacts> {
  const [
    trainingsRes,
    sessionsRes,
    progressRes,
    assignmentsRes,
    certificatesRes,
    prefsRes,
    memberRes,
    profileRes,
  ] = await Promise.all([
    admin.from("trainings").select("id, order_index"),
    admin.from("sessions").select("id, training_id, session_number, order_index"),
    admin.from("session_progress").select("*").eq("father_id", fatherId),
    admin.from("training_assignments").select("training_id, assigned_at").eq("father_id", fatherId),
    admin.from("certificates").select("id").eq("father_id", fatherId),
    admin.from("notification_preferences").select("timezone").eq("user_id", fatherId).maybeSingle(),
    admin
      .from("group_members")
      .select("joined_at")
      .eq("father_id", fatherId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin.from("profiles").select("created_at").eq("id", fatherId).maybeSingle(),
  ]);

  if (trainingsRes.error) throw trainingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (progressRes.error) throw progressRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (certificatesRes.error) throw certificatesRes.error;

  const trainings = (trainingsRes.data ?? []) as Array<
    Pick<Training, "id"> & { order_index?: number }
  >;
  const sessions = (sessionsRes.data ?? []) as Session[];
  const progress = (progressRes.data ?? []) as SessionProgress[];
  const progressBySession = new Map(progress.map((row) => [row.session_id, row]));
  const completed = progress.filter((row) => isSessionComplete(row) && row.completed_at);
  const membershipAt = earliestDate([
    memberRes.data?.joined_at as string | undefined,
    profileRes.data?.created_at as string | undefined,
  ]);

  const sessionsByTraining = new Map<string, Session[]>();
  for (const session of sessions) {
    const list = sessionsByTraining.get(session.training_id) ?? [];
    list.push(session);
    sessionsByTraining.set(session.training_id, list);
  }

  const sessionFacts: StreakSessionFact[] = [];
  for (const [trainingId, list] of sessionsByTraining) {
    const catalog = [...list].sort(
      (left, right) =>
        left.session_number - right.session_number || left.order_index - right.order_index
    );
    catalog.forEach((session, catalogIndex) => {
      const row = progressBySession.get(session.id) ?? null;
      sessionFacts.push({
        sessionId: session.id,
        trainingId,
        catalogIndex,
        completedAt: row?.completed_at ? new Date(row.completed_at) : null,
        flagsComplete: isSessionComplete(row),
      });
    });
  }

  return {
    trainings: trainings.map((row) => ({
      id: row.id,
    })),
    assignments: ((assignmentsRes.data ?? []) as Array<{ training_id: string; assigned_at: string | null }>)
      .map((row) => {
        const assignedAt = row.assigned_at ? new Date(row.assigned_at) : null;
        if (!assignedAt || Number.isNaN(assignedAt.getTime())) return null;
        return { trainingId: row.training_id, assignedAt };
      })
      .filter((row): row is StreakAssignmentFact => Boolean(row)),
    sessions: sessionFacts,
    completedAt: completed.map((row) => row.completed_at as string),
    timezone: resolveStreakTimeZone(prefsRes.data?.timezone as string | undefined),
    membershipAt,
    lifetimeSessions: completed.length,
    lifetimeCertificates: (certificatesRes.data ?? []).length,
  };
}

function earliestDate(values: Array<string | undefined>) {
  let earliest: Date | null = null;
  for (const value of values) {
    if (!value) continue;
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) continue;
    if (!earliest || at.getTime() < earliest.getTime()) earliest = at;
  }
  return earliest ?? new Date();
}
