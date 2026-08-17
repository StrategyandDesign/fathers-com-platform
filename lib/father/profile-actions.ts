"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import {
  ensureProfileDraft,
  loadLatestProfile,
  upsertProfileDraft,
} from "@/lib/father/profile";
import {
  PROFILE_QUESTION_COUNT,
  getProfileQuestion,
  parseAnswers,
} from "@/lib/father/questions";

function clampQuestion(value: number) {
  return Math.min(PROFILE_QUESTION_COUNT, Math.max(1, value));
}

function readAnswer(formData: FormData) {
  const raw = String(formData.get("value") ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 5) return null;
  return value;
}

export async function startProfile() {
  const { user } = await requireRole("father");
  const profile = await loadLatestProfile(user.id);
  if (profile) {
    redirect("/father/profile/results");
  }

  await ensureProfileDraft(user.id);
  revalidatePath("/father");
  revalidatePath("/father/profile");
  redirect("/father/profile/take");
}

export async function saveProfileProgress(formData: FormData) {
  const { user } = await requireRole("father");
  const intent = String(formData.get("intent") ?? "next");
  const questionId = clampQuestion(Number(formData.get("question_id") ?? 1));
  const draft = await ensureProfileDraft(user.id);
  const answers = parseAnswers(draft.answers);
  const value = readAnswer(formData);

  if (intent === "next" && value == null) {
    redirect(
      `/father/profile/take?q=${questionId}&error=${encodeURIComponent("Choose an answer to continue.")}`
    );
  }

  if (value != null) {
    answers[String(questionId)] = value;
  }

  let nextIndex = questionId;
  if (intent === "back") {
    nextIndex = clampQuestion(questionId - 1);
  } else if (intent === "next") {
    nextIndex = clampQuestion(questionId + 1);
  }

  await upsertProfileDraft(user.id, answers, nextIndex);
  revalidatePath("/father");
  revalidatePath("/father/profile");
  revalidatePath("/father/profile/take");

  if (intent === "exit") {
    redirect("/father");
  }

  redirect(`/father/profile/take?q=${nextIndex}`);
}
