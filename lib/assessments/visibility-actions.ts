"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import { loadManagerAssessmentDetail } from "@/lib/assessments/data";
import {
  loadOrganizationAssessmentReviews,
  loadPlatformAssessmentRelease,
} from "@/lib/assessments/data";
import {
  organizationMayOfferAssessment,
  reviewForGroup,
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

function visibilityPath(assessmentKey: string, groupId: string, returnTo: string) {
  if (returnTo === "list") return "/manager/assessments";
  if (assessmentKey === KEYSTONE_ASSESSMENT_KEY) {
    return `/manager/assessments/keystone?group=${encodeURIComponent(groupId)}`;
  }
  return `/manager/assessments/${assessmentKey}`;
}

function revalidateVisibility(assessmentKey: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/assessments");
  revalidatePath("/manager/assessments/keystone");
  revalidatePath("/father");
  revalidatePath("/father/assessments");
  revalidatePath("/father/profile");
  if (assessmentKey !== KEYSTONE_ASSESSMENT_KEY) {
    revalidatePath(`/manager/assessments/${assessmentKey}`);
  }
}

async function saveVisibility(formData: FormData, status: "available" | "hidden") {
  const { user } = await requireRole("manager");
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();
  const path = visibilityPath(assessmentKey, groupId, returnTo);

  if (!UUID.test(groupId)) {
    fail("/manager/assessments", "flash.assessmentVisibilityFailed");
  }
  if (assessmentKey !== KEYSTONE_ASSESSMENT_KEY && !UUID.test(assessmentKey)) {
    fail("/manager/assessments", "flash.assessmentVisibilityFailed");
  }
  if (!(await allowActionRateLimit("manager.assessment"))) {
    fail(path, "flash.assessmentVisibilityTooMany");
  }

  const supabase = await createClient();
  const { data: allowed, error: allowedError } = await supabase.rpc("is_manager_of_group", {
    group_id: groupId,
  });
  if (allowedError || !allowed) {
    fail("/manager/assessments", "flash.assessmentVisibilityFailed");
  }

  if (assessmentKey !== KEYSTONE_ASSESSMENT_KEY) {
    const detail = await loadManagerAssessmentDetail(user.id, assessmentKey);
    if (!detail) {
      fail("/manager/assessments", "flash.assessmentNotFound");
    }
  }

  if (assessmentKey === KEYSTONE_ASSESSMENT_KEY && status === "available") {
    const [release, reviews] = await Promise.all([
      loadPlatformAssessmentRelease(KEYSTONE_ASSESSMENT_KEY),
      loadOrganizationAssessmentReviews([groupId]),
    ]);
    const review = reviewForGroup(reviews, groupId, KEYSTONE_ASSESSMENT_KEY);
    if (
      !organizationMayOfferAssessment({
        assessmentKey,
        release,
        reviewStatus: review?.status ?? null,
      })
    ) {
      fail(path, "flash.assessmentShareNeedsAccept");
    }
  }

  const { error } = await supabase.from("organization_assessment_availability").upsert(
    {
      group_id: groupId,
      assessment_key: assessmentKey,
      status,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    },
    { onConflict: "group_id,assessment_key" }
  );

  if (error) {
    fail(path, "flash.assessmentVisibilityFailed");
  }

  await recordOrganizationActivity(supabase, {
    groupId,
    actorId: user.id,
    kind: status === "available" ? "assessment_shared" : "assessment_hidden",
    payload: { assessmentKey },
  });

  revalidateVisibility(assessmentKey);
  ok(
    path,
    status === "available" ? "flash.assessmentShared" : "flash.assessmentHidden"
  );
}

export async function shareAssessment(formData: FormData) {
  await saveVisibility(formData, "available");
}

export async function removeAssessment(formData: FormData) {
  await saveVisibility(formData, "hidden");
}
