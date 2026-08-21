"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isPlatformReviewKey } from "@/lib/assessments/first-party";
import { loadPlatformAssessmentRelease } from "@/lib/assessments/data";
import {
  ASSESSMENT_DECLINE_REASON_MAX,
  ASSESSMENT_REVERSE_ACCEPT_CONFIRM,
  isAssessmentCurrentlyReleased,
  isAssessmentReviewStatus,
  isLegacyCatalogAssessment,
} from "@/lib/assessments/reviews";
import { requireRole } from "@/lib/auth/session";
import { recordOrganizationActivity } from "@/lib/org-staff/activity";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function reviewPath(assessmentKey: string, groupId: string, returnTo: string) {
  if (returnTo === "list" || returnTo === "assessments") return "/manager/assessments";
  return `/manager/assessment-reviews/${assessmentKey}?group=${encodeURIComponent(groupId)}`;
}

function revalidateAssessmentReviews(assessmentKey: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/assessments");
  revalidatePath("/manager/assessments/keystone");
  revalidatePath(`/manager/assessments/${assessmentKey}`);
  revalidatePath(`/manager/assessment-reviews/${assessmentKey}`);
  revalidatePath("/father");
  revalidatePath("/father/assessments");
  revalidatePath("/father/profile");
  revalidatePath(`/father/assessments/p/${assessmentKey}`);
}

async function decideReview(formData: FormData, status: "accepted" | "declined") {
  const { user } = await requireRole("manager");
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const reason = String(formData.get("decline_reason") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  const quick = String(formData.get("quick") ?? "").trim() === "1";
  const returnTo = String(formData.get("return_to") ?? "").trim();
  const path = assessmentKey && groupId
    ? reviewPath(assessmentKey, groupId, returnTo)
    : "/manager/assessments";

  if (!isPlatformReviewKey(assessmentKey) || !UUID.test(groupId)) {
    fail("/manager/assessments", "flash.assessmentReviewMissing");
  }
  if (!(await allowActionRateLimit("manager.assessment"))) {
    fail(path, "flash.assessmentVisibilityTooMany");
  }
  if (status === "declined" && reason.length > ASSESSMENT_DECLINE_REASON_MAX) {
    fail(path, "flash.assessmentDeclineTooLong");
  }

  const supabase = await createClient();
  const { data: allowed, error: allowedError } = await supabase.rpc("is_manager_of_group", {
    group_id: groupId,
  });
  if (allowedError || !allowed) {
    fail("/manager/assessments", "flash.assessmentVisibilityFailed");
  }

  const { data: current, error: currentError } = await supabase
    .from("organization_assessment_reviews")
    .select("status")
    .eq("group_id", groupId)
    .eq("assessment_key", assessmentKey)
    .maybeSingle();

  if (currentError) {
    fail(path, "flash.assessmentReviewLoadFailed");
  }
  const release = await loadPlatformAssessmentRelease(assessmentKey);
  const currentlyReleased = isAssessmentCurrentlyReleased(release);
  const legacy = isLegacyCatalogAssessment(release, assessmentKey);

  if (current && !isAssessmentReviewStatus(current.status)) {
    fail("/manager/assessments", "flash.assessmentReviewNotWaiting");
  }
  if (!current && currentlyReleased && !legacy && status === "accepted") {
    fail("/manager/assessments", "flash.assessmentReviewNotWaiting");
  }

  if (status === "accepted") {
    if (current?.status === "declined" && !quick && confirm !== ASSESSMENT_REVERSE_ACCEPT_CONFIRM) {
      fail(path, "flash.assessmentReviewTypeAccept");
    }
    if (!currentlyReleased && !legacy) {
      fail(path, "flash.assessmentNoLongerReleased");
    }
  }

  const decision = {
    status,
    decline_reason: status === "declined" ? reason || null : null,
    decided_by: user.id,
    decided_at: new Date().toISOString(),
  };
  const { error } = current
    ? await supabase
        .from("organization_assessment_reviews")
        .update(decision)
        .eq("group_id", groupId)
        .eq("assessment_key", assessmentKey)
    : await supabase.from("organization_assessment_reviews").insert({
        group_id: groupId,
        assessment_key: assessmentKey,
        ...decision,
      });

  if (error) {
    fail(path, "flash.assessmentReviewSaveFailed");
  }

  if (status === "accepted") {
    const { error: hideError } = await supabase.from("organization_assessment_availability").upsert(
      {
        group_id: groupId,
        assessment_key: assessmentKey,
        status: "hidden",
        decided_by: user.id,
        decided_at: new Date().toISOString(),
      },
      { onConflict: "group_id,assessment_key" }
    );
    if (hideError) {
      console.error("[assessment-reviews] default hide failed", hideError.message);
    }
  }

  await recordOrganizationActivity(supabase, {
    groupId,
    actorId: user.id,
    kind: status === "accepted" ? "assessment_accepted" : "assessment_declined",
    payload: { assessmentKey },
  });

  revalidateAssessmentReviews(assessmentKey);

  if (status === "accepted") {
    ok(
      path,
      current?.status === "declined"
        ? "flash.assessmentAcceptedAgain"
        : "flash.assessmentAccepted"
    );
  }

  ok(
    path,
    current?.status === "accepted"
      ? "flash.assessmentDeclinedAfterAccept"
      : "flash.assessmentDeclined"
  );
}

export async function acceptAssessmentRelease(formData: FormData) {
  await decideReview(formData, "accepted");
}

export async function declineAssessmentRelease(formData: FormData) {
  await decideReview(formData, "declined");
}
