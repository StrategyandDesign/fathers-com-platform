import "server-only";

import {
  getFirstPartyAssessment,
  isFirstPartyAssessmentKey,
  listFirstPartyAssessments,
  type FirstPartyAssessment,
} from "@/lib/assessments/first-party";
import { instrumentMaxTotal } from "@/lib/assessments/instrument";
import {
  overlayFirstPartyAssessment,
  type FirstPartyCatalogRow,
} from "@/lib/assessments/first-party-catalog";
import {
  loadAssessmentAvailability,
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
  loadPlatformAssessmentReleases,
} from "@/lib/assessments/data";
import {
  fatherCanStartAssessment,
  primaryFatherGroupId,
} from "@/lib/assessments/availability";
import { reviewForGroup } from "@/lib/assessments/reviews";
import { createClient } from "@/lib/supabase/server";

export type FirstPartyAttempt = {
  userId: string;
  assessmentKey: string;
  answers: Record<string, number>;
  total: number | null;
  outcomeKey: string | null;
  outcomeLabel: string | null;
  outcomeDescription: string | null;
  startedAt: string;
  completedAt: string | null;
};

function missingRelation(error: { message?: string; code?: string } | null, table: string) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    new RegExp(`${table}|does not exist|Could not find the table`, "i").test(error.message ?? "")
  );
}

function missingAttemptRelation(error: { message?: string; code?: string } | null) {
  return missingRelation(error, "catalog_assessment_attempts");
}

function asAnswers(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const answers: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "number" && Number.isFinite(entry)) answers[key] = entry;
  }
  return answers;
}

function asAttempt(row: Record<string, unknown>): FirstPartyAttempt {
  return {
    userId: String(row.user_id ?? ""),
    assessmentKey: String(row.assessment_key ?? ""),
    answers: asAnswers(row.answers),
    total: typeof row.total === "number" ? row.total : null,
    outcomeKey: typeof row.outcome_key === "string" ? row.outcome_key : null,
    outcomeLabel: typeof row.outcome_label === "string" ? row.outcome_label : null,
    outcomeDescription:
      typeof row.outcome_description === "string" ? row.outcome_description : null,
    startedAt: String(row.started_at ?? ""),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

function asCatalogRow(row: Record<string, unknown>): FirstPartyCatalogRow {
  return {
    title: typeof row.title === "string" ? row.title : null,
    description: typeof row.description === "string" ? row.description : null,
    instrument: row.instrument,
    lastEditedAt: typeof row.last_edited_at === "string" ? row.last_edited_at : null,
  };
}

export async function loadFirstPartyCatalogRows(keys: string[]) {
  const rows = new Map<string, FirstPartyCatalogRow>();
  if (keys.length === 0) return rows;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessments")
    .select("assessment_key, title, description, instrument, last_edited_at")
    .in("assessment_key", keys);
  if (missingRelation(error, "platform_assessments")) return rows;
  if (error) {
    if (
      error.code === "42501" ||
      /permission denied|row-level security/i.test(error.message ?? "")
    ) {
      return rows;
    }
    throw error;
  }
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const key = String(row.assessment_key ?? "");
    if (!key) continue;
    rows.set(key, asCatalogRow(row));
  }
  return rows;
}

export async function loadFirstPartyCatalog(
  assessmentKey: string
): Promise<FirstPartyAssessment | null> {
  const seed = getFirstPartyAssessment(assessmentKey);
  if (!seed) return null;
  const rows = await loadFirstPartyCatalogRows([assessmentKey]);
  return overlayFirstPartyAssessment(seed, rows.get(assessmentKey) ?? null);
}

export async function loadFirstPartyCatalogList(): Promise<FirstPartyAssessment[]> {
  const seeds = listFirstPartyAssessments();
  const rows = await loadFirstPartyCatalogRows(seeds.map((assessment) => assessment.key));
  return seeds.map((seed) => overlayFirstPartyAssessment(seed, rows.get(seed.key) ?? null));
}

export async function loadFirstPartyAttempt(userId: string, assessmentKey: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_assessment_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("assessment_key", assessmentKey)
    .maybeSingle();
  if (missingAttemptRelation(error)) return null;
  if (error) throw error;
  return data ? asAttempt(data as Record<string, unknown>) : null;
}

export async function loadFirstPartyAttempts(userId: string) {
  const keys = listFirstPartyAssessments().map((assessment) => assessment.key);
  if (keys.length === 0) return [] as FirstPartyAttempt[];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_assessment_attempts")
    .select("*")
    .eq("user_id", userId)
    .in("assessment_key", keys);
  if (missingAttemptRelation(error)) return [];
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(asAttempt);
}

export async function loadFirstPartyCompletedByGroup(
  groupIds: string[],
  assessmentKeys: string[]
) {
  const empty: Record<string, Record<string, number>> = {};
  for (const key of assessmentKeys) empty[key] = {};
  if (groupIds.length === 0 || assessmentKeys.length === 0) return empty;

  const supabase = await createClient();
  const membersRes = await supabase
    .from("group_members")
    .select("father_id, group_id")
    .in("group_id", groupIds);
  if (membersRes.error) throw membersRes.error;

  const fatherToGroup = new Map<string, string>();
  for (const row of membersRes.data ?? []) {
    if (!fatherToGroup.has(row.father_id)) fatherToGroup.set(row.father_id, row.group_id);
  }
  const fatherIds = [...fatherToGroup.keys()];
  if (fatherIds.length === 0) return empty;

  const { data, error } = await supabase
    .from("catalog_assessment_attempts")
    .select("user_id, assessment_key")
    .in("user_id", fatherIds)
    .in("assessment_key", assessmentKeys)
    .not("completed_at", "is", null);
  if (missingAttemptRelation(error)) return empty;
  if (error) throw error;

  for (const row of data ?? []) {
    const groupId = fatherToGroup.get(row.user_id);
    if (!groupId) continue;
    const byGroup = empty[row.assessment_key] ?? (empty[row.assessment_key] = {});
    byGroup[groupId] = (byGroup[groupId] ?? 0) + 1;
  }
  return empty;
}

export async function upsertFirstPartyAttempt(input: {
  userId: string;
  assessmentKey: string;
  answers: Record<string, number>;
  total?: number | null;
  outcomeKey?: string | null;
  outcomeLabel?: string | null;
  outcomeDescription?: string | null;
  completedAt?: string | null;
}) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("catalog_assessment_attempts")
    .upsert(
      {
        user_id: input.userId,
        assessment_key: input.assessmentKey,
        answers: input.answers,
        total: input.total ?? null,
        outcome_key: input.outcomeKey ?? null,
        outcome_label: input.outcomeLabel ?? null,
        outcome_description: input.outcomeDescription ?? null,
        completed_at: input.completedAt ?? null,
        updated_at: now,
      },
      { onConflict: "user_id,assessment_key" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return asAttempt(data as Record<string, unknown>);
}

export async function resetFirstPartyAttempt(userId: string, assessmentKey: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_assessment_attempts")
    .delete()
    .eq("user_id", userId)
    .eq("assessment_key", assessmentKey);
  if (missingAttemptRelation(error)) return;
  if (error) throw error;
}

export type FatherFirstPartyCard = {
  key: string;
  title: string;
  description: string;
  questionCount: number;
  maxTotal: number;
  canStart: boolean;
  attempt: FirstPartyAttempt | null;
};

export async function loadFatherFirstPartyCards(input: {
  fatherId: string;
  groupIds: string[];
  homeGroupId?: string | null;
  availability: Awaited<ReturnType<typeof loadAssessmentAvailability>>;
  reviews: Awaited<ReturnType<typeof loadOrganizationAssessmentReviews>>;
}) {
  const assessments = await loadFirstPartyCatalogList();
  const [releases, attempts] = await Promise.all([
    loadPlatformAssessmentReleases(assessments.map((assessment) => assessment.key)),
    loadFirstPartyAttempts(input.fatherId),
  ]);
  const attemptByKey = new Map(attempts.map((attempt) => [attempt.assessmentKey, attempt]));
  const groupId = primaryFatherGroupId(input.groupIds, input.homeGroupId);

  const cards: FatherFirstPartyCard[] = [];
  for (const assessment of assessments) {
    const attempt = attemptByKey.get(assessment.key) ?? null;
    const review = groupId ? reviewForGroup(input.reviews, groupId, assessment.key) : null;
    const canStart = fatherCanStartAssessment({
      rows: input.availability,
      groupIds: input.groupIds,
      homeGroupId: input.homeGroupId,
      assessmentKey: assessment.key,
      hasProgress: Boolean(attempt && !attempt.completedAt),
      release: releases.get(assessment.key) ?? null,
      reviewStatus: review?.status ?? null,
    });
    if (!canStart && !attempt) continue;
    cards.push({
      key: assessment.key,
      title: assessment.title,
      description: assessment.description,
      questionCount: assessment.questionCount,
      maxTotal: instrumentMaxTotal(assessment.instrument),
      canStart,
      attempt,
    });
  }
  return cards;
}

export async function loadFatherFirstPartyAccess(fatherId: string, assessmentKey: string) {
  if (!isFirstPartyAssessmentKey(assessmentKey)) return null;
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  if (!assessment) return null;

  const supabase = await createClient();
  const [membershipsRes, profileRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id")
      .eq("father_id", fatherId)
      .order("joined_at", { ascending: true }),
    supabase.from("profiles").select("home_group_id").eq("id", fatherId).maybeSingle(),
  ]);
  if (membershipsRes.error) throw membershipsRes.error;
  if (profileRes.error) throw profileRes.error;

  const groupIds = [...new Set((membershipsRes.data ?? []).map((row) => String(row.group_id)))];
  const homeGroupId =
    typeof profileRes.data?.home_group_id === "string" ? profileRes.data.home_group_id : null;
  const [availability, reviews, release, attempt] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformAssessmentRelease(assessmentKey),
    loadFirstPartyAttempt(fatherId, assessmentKey),
  ]);
  const groupId = primaryFatherGroupId(groupIds, homeGroupId);
  const review = groupId ? reviewForGroup(reviews, groupId, assessmentKey) : null;
  const canStart = fatherCanStartAssessment({
    rows: availability,
    groupIds,
    homeGroupId,
    assessmentKey,
    hasProgress: Boolean(attempt && !attempt.completedAt),
    release,
    reviewStatus: review?.status ?? null,
  });

  return { assessment, attempt, canStart, release, review };
}
