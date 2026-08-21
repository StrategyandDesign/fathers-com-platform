"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { firstPartyTakePath } from "@/lib/assessments/first-party";
import { loadFirstPartyCatalog } from "@/lib/assessments/first-party-data";
import {
  loadFatherFirstPartyAccess,
  resetFirstPartyAttempt,
  upsertFirstPartyAttempt,
} from "@/lib/assessments/first-party-data";
import { evaluateInstrument } from "@/lib/assessments/instrument";
import { requireRole } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function revalidateTake(assessmentKey: string) {
  revalidatePath("/father");
  revalidatePath("/father/assessments");
  revalidatePath(firstPartyTakePath(assessmentKey));
  revalidatePath("/manager/assessments");
  revalidatePath(`/manager/assessments/${assessmentKey}`);
}

function parseAnswers(formData: FormData, itemIds: string[]) {
  const answers: Record<string, number> = {};
  for (const itemId of itemIds) {
    const raw = formData.get(`answer_${itemId}`);
    const value = Number(raw);
    if (Number.isFinite(value)) answers[itemId] = value;
  }
  return answers;
}

export async function saveFirstPartyProgress(formData: FormData) {
  const { user } = await requireRole("father");
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  const path = assessment ? firstPartyTakePath(assessmentKey) : "/father/assessments";
  if (!assessment) fail("/father/assessments", "flash.assessmentNotFound");
  if (!(await allowActionRateLimit("father.assessment"))) {
    fail(path, "flash.assessmentVisibilityTooMany");
  }

  const access = await loadFatherFirstPartyAccess(user.id, assessmentKey);
  if (!access || (!access.canStart && !access.attempt)) {
    fail("/father/assessments", "flash.keystoneUnavailable");
  }

  const answers = {
    ...(access?.attempt?.answers ?? {}),
    ...parseAnswers(formData, assessment.instrument.items.map((item) => item.id)),
  };
  const intent = String(formData.get("intent") ?? "next").trim();
  const current = Number(formData.get("question_index") ?? 1);
  const nextIndex =
    intent === "back"
      ? Math.max(1, current - 1)
      : Math.min(assessment.questionCount, current + 1);

  await upsertFirstPartyAttempt({
    userId: user.id,
    assessmentKey,
    answers,
    completedAt: null,
  });
  revalidateTake(assessmentKey);

  if (intent === "exit") {
    redirect("/father/assessments?notice=" + encodeURIComponent("Saved."));
  }
  redirect(`${path}?q=${nextIndex}`);
}

export async function completeFirstPartyAssessment(formData: FormData) {
  const { user } = await requireRole("father");
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  const path = assessment ? firstPartyTakePath(assessmentKey) : "/father/assessments";
  if (!assessment) fail("/father/assessments", "flash.assessmentNotFound");
  if (!(await allowActionRateLimit("father.assessment"))) {
    fail(path, "flash.assessmentVisibilityTooMany");
  }

  const access = await loadFatherFirstPartyAccess(user.id, assessmentKey);
  if (!access || (!access.canStart && !access.attempt)) {
    fail("/father/assessments", "flash.keystoneUnavailable");
  }

  const answers = {
    ...(access?.attempt?.answers ?? {}),
    ...parseAnswers(formData, assessment.instrument.items.map((item) => item.id)),
  };

  let result;
  try {
    result = evaluateInstrument(assessment.instrument, answers);
  } catch {
    fail(`${path}?q=${assessment.questionCount}`, "Answer every question before you see your result.");
  }

  await upsertFirstPartyAttempt({
    userId: user.id,
    assessmentKey,
    answers,
    total: result.total,
    outcomeKey: result.outcomeKey,
    outcomeLabel: result.outcomeLabel,
    outcomeDescription: result.outcomeDescription,
    completedAt: new Date().toISOString(),
  });
  revalidateTake(assessmentKey);
  redirect(`${path}?view=results`);
}

export async function retakeFirstPartyAssessment(formData: FormData) {
  const { user } = await requireRole("father");
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  const path = assessment ? firstPartyTakePath(assessmentKey) : "/father/assessments";
  if (!assessment) fail("/father/assessments", "flash.assessmentNotFound");
  if (!(await allowActionRateLimit("father.assessment"))) {
    fail(path, "flash.assessmentVisibilityTooMany");
  }

  const access = await loadFatherFirstPartyAccess(user.id, assessmentKey);
  if (!access || (!access.canStart && !access.attempt)) {
    fail("/father/assessments", "flash.keystoneUnavailable");
  }

  await resetFirstPartyAttempt(user.id, assessmentKey);
  revalidateTake(assessmentKey);
  redirect(`${path}?view=intro`);
}
