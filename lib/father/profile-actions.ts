"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadFatherAssessmentAccess } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import {
  deleteProfileDraft,
  ensureProfileDraft,
  loadLatestProfile,
  loadProfileDraft,
  upsertProfileDraft,
} from "@/lib/father/profile";
import {
  PROFILE_QUESTION_COUNT,
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
  const [profile, draft, access] = await Promise.all([
    loadLatestProfile(user.id),
    loadProfileDraft(user.id),
    loadFatherAssessmentAccess(user.id),
  ]);
  if (profile && !draft) {
    redirect("/father/profile/results");
  }
  if (!draft && !access.canStartKeystone) {
    redirect("/father/assessments?error=flash.keystoneUnavailable");
  }

  await ensureProfileDraft(user.id);
  revalidatePath("/father");
  revalidatePath("/father/profile");
  redirect("/father/profile/take");
}

export async function retakeProfile() {
  const { user } = await requireRole("father");
  const access = await loadFatherAssessmentAccess(user.id);
  if (!access.canStartKeystone) {
    redirect("/father/profile?error=flash.keystoneUnavailable");
  }
  await deleteProfileDraft(user.id);
  await ensureProfileDraft(user.id);
  revalidatePath("/father");
  revalidatePath("/father/profile");
  revalidatePath("/father/profile/take");
  redirect("/father/profile/take?q=1");
}

type ProfileIntent = "next" | "back" | "exit";

function readIntent(formData: FormData): ProfileIntent {
  const raw = String(formData.get("intent") ?? "next");
  if (raw === "back" || raw === "exit") return raw;
  return "next";
}

export async function saveProfileProgress(formData: FormData) {
  await persistProfileProgress(formData, readIntent(formData));
}

export async function saveAndExitProfile(formData: FormData) {
  await persistProfileProgress(formData, "exit");
}

async function persistProfileProgress(formData: FormData, intent: ProfileIntent) {
  const { user } = await requireRole("father");
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
    redirect(
      `/father/profile?notice=${encodeURIComponent(
        "Your Assessment progress is saved. You can continue from Assessments."
      )}`
    );
  }

  redirect(`/father/profile/take?q=${nextIndex}`);
}
