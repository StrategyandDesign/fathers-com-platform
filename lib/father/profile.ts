import { createClient } from "@/lib/supabase/server";
import { parseAnswers } from "@/lib/father/questions";
import type { FatherProfileSummary } from "@/lib/father/types";

export type ProfileDraft = {
  father_id: string;
  answers: Record<string, number>;
  current_index: number;
  updated_at: string;
};

export type FatherProfileResult = FatherProfileSummary & {
  primary_determination: string | null;
  raw_scores: Record<string, unknown>;
  full_results: Record<string, unknown>;
};

function asDraft(row: {
  father_id: string;
  answers: unknown;
  current_index: number;
  updated_at: string;
}): ProfileDraft {
  return {
    father_id: row.father_id,
    answers: parseAnswers(row.answers),
    current_index: row.current_index,
    updated_at: row.updated_at,
  };
}

export async function loadLatestProfile(fatherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("father_profiles")
    .select("id, taken_at, primary_edge, primary_determination, raw_scores, full_results")
    .eq("father_id", fatherId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as FatherProfileResult | null) ?? null;
}

export async function loadProfileHistory(fatherId: string, limit = 2) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("father_profiles")
    .select("id, taken_at, primary_edge, primary_determination, raw_scores, full_results")
    .eq("father_id", fatherId)
    .order("taken_at", { ascending: false })
    .limit(Math.max(1, limit));

  if (error) throw error;
  return (data as FatherProfileResult[] | null) ?? [];
}

export async function loadProfileDraft(fatherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("father_profile_drafts")
    .select("father_id, answers, current_index, updated_at")
    .eq("father_id", fatherId)
    .maybeSingle();

  if (error) throw error;
  return data ? asDraft(data) : null;
}

export async function loadProfileState(fatherId: string) {
  const [profile, draft] = await Promise.all([
    loadLatestProfile(fatherId),
    loadProfileDraft(fatherId),
  ]);
  return { profile, draft };
}

export async function upsertProfileDraft(
  fatherId: string,
  answers: Record<string, number>,
  currentIndex: number
) {
  const supabase = await createClient();
  const { error } = await supabase.from("father_profile_drafts").upsert(
    {
      father_id: fatherId,
      answers,
      current_index: currentIndex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "father_id" }
  );

  if (error) throw error;
}

export async function ensureProfileDraft(fatherId: string) {
  const existing = await loadProfileDraft(fatherId);
  if (existing) return existing;

  await upsertProfileDraft(fatherId, {}, 1);
  return {
    father_id: fatherId,
    answers: {},
    current_index: 1,
    updated_at: new Date().toISOString(),
  } satisfies ProfileDraft;
}

export async function deleteProfileDraft(fatherId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("father_profile_drafts")
    .delete()
    .eq("father_id", fatherId);

  if (error) throw error;
}
