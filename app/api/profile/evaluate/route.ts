import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
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
import { evaluateProfile, profilePersistFields } from "@/lib/profile/score";
import { createClient } from "@/lib/supabase/server";

function takeError(takePath: string, message: string, questionId?: number) {
  const params = new URLSearchParams({ error: message });
  if (questionId) params.set("q", String(questionId));
  redirect(`${takePath}?${params.toString()}`);
}

export async function POST(request: Request) {
  const { user, role, deactivated } = await getAuthContext();
  if (deactivated) {
    redirect("/login?error=This account has been deactivated.");
  }
  if (!user || (role !== "father" && role !== "manager")) {
    redirect("/login");
  }

  const takePath =
    role === "manager" ? "/manager/practice/profile/take" : "/father/profile/take";
  const resultsPath =
    role === "manager" ? "/manager/practice/profile/results" : "/father/profile/results";

  const supabase = await createClient();
  const existing = await loadLatestProfile(user.id);
  const draft = await loadProfileDraft(user.id);
  if (existing && !draft) {
    redirect(resultsPath);
  }

  const formData = await request.formData();
  const questionId = Number(formData.get("question_id") ?? 0);
  const rawValue = Number(formData.get("value") ?? 0);

  const answers = parseAnswers(draft?.answers);

  if (Number.isInteger(rawValue) && rawValue >= 1 && rawValue <= 5 && questionId > 0) {
    answers[String(questionId)] = rawValue;
  }

  if (!hasAllAnswers(answers)) {
    takeError(takePath, "Answer every question before you submit.", firstUnanswered(answers));
  }

  const evaluation = evaluateProfile(answers);

  const { error } = await supabase.from("father_profiles").insert({
    father_id: user.id,
    ...profilePersistFields(evaluation),
  });

  if (error) {
    await upsertProfileDraft(user.id, answers, firstUnanswered(answers));
    takeError(takePath, "Your Assessment didn’t save. Try again.", questionId || firstUnanswered(answers));
  }

  await deleteProfileDraft(user.id);
  redirect(resultsPath);
}

export async function GET() {
  const { role } = await getAuthContext();
  redirect(role === "manager" ? "/manager/practice" : "/father/profile");
}
