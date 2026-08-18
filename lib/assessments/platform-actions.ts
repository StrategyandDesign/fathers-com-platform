"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  loadPublishedPlatformAssessmentByKey,
  loadUserPlatformAttempt,
  loadAttemptResponses,
} from "@/lib/admin/platform-assessment-data";
import {
  PLATFORM_SCALE_MAX,
  PLATFORM_SCALE_MIN,
  platformTakeHref,
  scoreInstrument,
} from "@/lib/admin/platform-assessments";
import {
  fatherCanStartAssessment,
  leaderCanStartAssessment,
  primaryFatherGroupId,
} from "@/lib/assessments/availability";
import {
  loadAssessmentAvailability,
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
} from "@/lib/assessments/data";
import { reviewForGroup } from "@/lib/assessments/reviews";
import { requireWalkUser } from "@/lib/auth/session";
import { loadManagerGroups } from "@/lib/manager/data";
import { PRACTICE_ROOT } from "@/lib/practice/paths";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function takePath(assessmentKey: string, role: "father" | "manager", question?: number) {
  return platformTakeHref(assessmentKey, question, {
    root: role === "manager" ? PRACTICE_ROOT : "/father",
  });
}

function revalidateTake(assessmentKey: string) {
  revalidatePath("/father");
  revalidatePath("/father/assessments");
  revalidatePath(`/father/assessments/p/${assessmentKey}`);
  revalidatePath("/manager/practice");
  revalidatePath(`/manager/practice/assessments/p/${assessmentKey}`);
  revalidatePath("/manager/assessments");
}

async function canTake(userId: string, role: "father" | "manager", assessmentKey: string) {
  const supabase = await createClient();
  if (role === "manager") {
    const groups = await loadManagerGroups(userId);
    const groupIds = groups.map((group) => group.id);
    const [availability, reviews, release] = await Promise.all([
      loadAssessmentAvailability(groupIds),
      loadOrganizationAssessmentReviews(groupIds),
      loadPlatformAssessmentRelease(assessmentKey),
    ]);
    return leaderCanStartAssessment({
      rows: availability,
      groupIds,
      assessmentKey,
      release,
      reviewStatusForGroup: (groupId) =>
        reviewForGroup(reviews, groupId, assessmentKey)?.status ?? null,
    });
  }

  const [membershipsRes, profileRes] = await Promise.all([
    supabase.from("group_members").select("group_id").eq("father_id", userId),
    supabase.from("profiles").select("home_group_id").eq("id", userId).maybeSingle(),
  ]);
  if (membershipsRes.error) return false;
  const groupIds = [...new Set((membershipsRes.data ?? []).map((row) => String(row.group_id)))];
  const homeGroupId =
    typeof profileRes.data?.home_group_id === "string" ? profileRes.data.home_group_id : null;
  const [availability, reviews, release] = await Promise.all([
    loadAssessmentAvailability(groupIds),
    loadOrganizationAssessmentReviews(groupIds),
    loadPlatformAssessmentRelease(assessmentKey),
  ]);
  const groupId = primaryFatherGroupId(groupIds, homeGroupId);
  const review = groupId ? reviewForGroup(reviews, groupId, assessmentKey) : null;
  return fatherCanStartAssessment({
    rows: availability,
    groupIds,
    homeGroupId,
    assessmentKey,
    release,
    reviewStatus: review?.status ?? null,
  });
}

async function ensureAttempt(userId: string, assessmentId: string) {
  const existing = await loadUserPlatformAttempt(userId, assessmentId);
  if (existing) return existing;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessment_attempts")
    .insert({
      assessment_id: assessmentId,
      father_id: userId,
      status: "in_progress",
    })
    .select(
      "id, assessment_id, father_id, status, started_at, completed_at, overall_score, band_label, band_description, domain_scores"
    )
    .maybeSingle();

  if (error) {
    const raced = await loadUserPlatformAttempt(userId, assessmentId);
    if (raced) return raced;
    throw error;
  }
  return data;
}

export async function savePlatformAnswer(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const rawValue = Number(formData.get("value"));
  const questionNumber = Number(formData.get("question_number") ?? 1);
  const finish = String(formData.get("finish") ?? "") === "true";
  const exitAfter = String(formData.get("exit") ?? "") === "true";
  const path = takePath(assessmentKey, role, Number.isInteger(questionNumber) ? questionNumber : 1);
  const listPath = role === "manager" ? PRACTICE_ROOT : "/father/assessments";

  if (!assessmentKey || !itemId) fail(listPath, "flash.assessmentLoadFailed");
  if (!Number.isInteger(rawValue) || rawValue < PLATFORM_SCALE_MIN || rawValue > PLATFORM_SCALE_MAX) {
    fail(path, "flash.chooseAnswer");
  }

  const assessment = await loadPublishedPlatformAssessmentByKey(assessmentKey);
  if (!assessment || !assessment.published) {
    fail(listPath, "flash.keystoneUnavailable");
  }

  const existing = await loadUserPlatformAttempt(user.id, assessment.id);
  if (existing?.status !== "completed") {
    const allowed = await canTake(user.id, role, assessmentKey);
    if (!allowed && !existing) {
      fail(listPath, "flash.keystoneUnavailable");
    }
  }
  if (existing?.status === "completed") {
    redirect(takePath(assessmentKey, role));
  }

  const items = assessment.instrument.domains.flatMap((domain) =>
    domain.items.map((item) => ({
      id: item.clientId,
      domain,
      item,
    }))
  );
  const current = items.find((row) => row.id === itemId);
  if (!current) fail(path, "flash.questionNotFound");

  const attempt = existing ?? (await ensureAttempt(user.id, assessment.id));
  if (!attempt || attempt.status === "completed") {
    redirect(takePath(assessmentKey, role));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("platform_assessment_responses").upsert(
    {
      attempt_id: attempt.id,
      item_id: itemId,
      value: rawValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,item_id" }
  );
  if (error) fail(path, "flash.answerSaveFailed");

  const answers = await loadAttemptResponses(attempt.id);
  answers.set(itemId, rawValue);

  if (finish) {
    const scored = scoreInstrument({
      domains: assessment.instrument.domains.map((domain) => ({
        id: domain.clientId,
        key: domain.key,
        title: domain.title,
        weight: domain.weight,
        items: domain.items.map((item) => ({
          id: item.clientId,
          weight: item.weight,
          reverseScored: item.reverseScored,
        })),
      })),
      answers: Object.fromEntries(answers),
      bands: assessment.instrument.bands.map((band) => ({
        minScore: band.minScore,
        maxScore: band.maxScore,
        label: band.label,
        labelHe: band.labelHe,
        description: band.description,
        descriptionHe: band.descriptionHe,
      })),
    });
    if (!scored.complete) {
      fail(path, "flash.answerEveryQuestion");
    }

    const { error: completeError } = await supabase
      .from("platform_assessment_attempts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_score: scored.overall,
        band_label: scored.band?.label ?? null,
        band_description: scored.band?.description ?? null,
        domain_scores: scored.domains.map((domain) => ({
          key: domain.key,
          title: domain.title,
          score: domain.score,
        })),
      })
      .eq("id", attempt.id)
      .eq("status", "in_progress");
    if (completeError) fail(path, "flash.assessmentFinishFailed");

    revalidateTake(assessmentKey);
    redirect(
      `${takePath(assessmentKey, role)}?notice=${encodeURIComponent("flash.assessmentComplete")}`
    );
  }

  revalidateTake(assessmentKey);
  if (exitAfter) {
    redirect(
      `${listPath}?notice=${encodeURIComponent("flash.profileProgressSaved")}`
    );
  }
  const nextNumber = Math.min(items.length, Math.max(1, questionNumber + 1));
  redirect(takePath(assessmentKey, role, nextNumber));
}

export async function saveAndExitPlatformAssessment(formData: FormData) {
  formData.set("exit", "true");
  await savePlatformAnswer(formData);
}

