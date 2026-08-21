"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadFatherAssessmentAccess, loadLeaderAssessmentAccess } from "@/lib/assessments/data";
import { requireWalkUser } from "@/lib/auth/session";
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
import { walkPathsFor } from "@/lib/practice/paths";

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

async function canStartKeystone(userId: string, role: "father" | "manager") {
  if (role === "manager") {
    const access = await loadLeaderAssessmentAccess(userId);
    return access.canStartKeystone;
  }
  const access = await loadFatherAssessmentAccess(userId);
  return access.canStartKeystone;
}

export async function startProfile() {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const [profile, draft, allowed] = await Promise.all([
    loadLatestProfile(user.id),
    loadProfileDraft(user.id),
    canStartKeystone(user.id, role),
  ]);
  if (profile && !draft) {
    redirect(paths.profileResults);
  }
  if (!draft && !allowed) {
    redirect(`${paths.assessments.replace(/#.*$/, "")}?error=flash.keystoneUnavailable`);
  }

  await ensureProfileDraft(user.id);
  revalidatePath("/father");
  revalidatePath("/father/profile");
  revalidatePath("/father/assessments");
  revalidatePath("/manager/practice");
  redirect(paths.profileTake);
}

export async function retakeProfile() {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const allowed = await canStartKeystone(user.id, role);
  if (!allowed) {
    redirect(`${paths.home}?error=flash.keystoneUnavailable`);
  }
  await deleteProfileDraft(user.id);
  await ensureProfileDraft(user.id);
  revalidatePath("/father");
  revalidatePath("/father/profile");
  revalidatePath("/father/profile/take");
  revalidatePath("/father/assessments");
  revalidatePath("/manager/practice");
  revalidatePath(paths.profileTake);
  redirect(`${paths.profileTake}?q=1`);
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
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const questionId = clampQuestion(Number(formData.get("question_id") ?? 1));
  const draft = await ensureProfileDraft(user.id);
  const answers = parseAnswers(draft.answers);
  const value = readAnswer(formData);

  if (intent === "next" && value == null) {
    redirect(
      `${paths.profileTake}?q=${questionId}&error=${encodeURIComponent("Choose an answer to continue.")}`
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
  revalidatePath("/father/assessments");
  revalidatePath("/manager/practice");
  revalidatePath(paths.profileTake);

  if (intent === "exit") {
    redirect(
      `${paths.home}?notice=${encodeURIComponent(
        "Your Assessment progress is saved. You can continue from this page."
      )}`
    );
  }

  redirect(`${paths.profileTake}?q=${nextIndex}`);
}
