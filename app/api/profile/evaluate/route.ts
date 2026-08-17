import { redirect } from "next/navigation";

import { resolveRole } from "@/lib/auth/roles";
import { evaluatePlaceholder } from "@/lib/father/evaluate";
import {
  deleteProfileDraft,
  loadLatestProfile,
  loadProfileDraft,
  upsertProfileDraft,
} from "@/lib/father/profile";
import {
  firstUnanswered,
  hasAllAnswers,
  parseAnswers,
} from "@/lib/father/questions";
import { createClient } from "@/lib/supabase/server";

function takeError(message: string, questionId?: number) {
  const params = new URLSearchParams({ error: message });
  if (questionId) params.set("q", String(questionId));
  redirect(`/father/profile/take?${params.toString()}`);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || resolveRole(user) !== "father") {
    redirect("/login");
  }

  const existing = await loadLatestProfile(user.id);
  if (existing) {
    redirect("/father/profile/results");
  }

  const formData = await request.formData();
  const questionId = Number(formData.get("question_id") ?? 0);
  const rawValue = Number(formData.get("value") ?? 0);

  const draft = await loadProfileDraft(user.id);
  const answers = parseAnswers(draft?.answers);

  if (Number.isInteger(rawValue) && rawValue >= 1 && rawValue <= 5 && questionId > 0) {
    answers[String(questionId)] = rawValue;
  }

  if (!hasAllAnswers(answers)) {
    takeError("Answer every question before you submit.", firstUnanswered(answers));
  }

  const evaluation = evaluatePlaceholder(answers);

  const { error } = await supabase.from("father_profiles").insert({
    father_id: user.id,
    primary_edge: evaluation.primary_edge,
    primary_determination: evaluation.primary_determination,
    raw_scores: evaluation.raw_scores,
    full_results: evaluation.full_results,
  });

  if (error) {
    await upsertProfileDraft(user.id, answers, firstUnanswered(answers));
    takeError(error.message, questionId || firstUnanswered(answers));
  }

  await deleteProfileDraft(user.id);
  redirect("/father/profile/results");
}

export async function GET() {
  redirect("/father/profile");
}
