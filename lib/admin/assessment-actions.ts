"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  RELEASE_CONFIRM,
  UNRELEASE_CONFIRM,
  releaseAssessmentToManagers,
  unreleaseAssessmentFromManagers,
} from "@/lib/admin/assessment-release";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import { firstPartyAdminPath, isPlatformReviewKey } from "@/lib/assessments/first-party";
import { ROLE_HOME } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const RELEASE_WRITE_ERROR = "Unable to update release status. Please try again.";
const RELEASE_NOTIFY_WARNING =
  "Released, but some Leader emails did not send. They still have the in-app notice.";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function finish(path: string, input: { notice?: string; error?: string }): never {
  const params = new URLSearchParams();
  if (input.error) params.set("error", input.error);
  if (input.notice) params.set("notice", input.notice);
  redirect(`${path}?${params.toString()}`);
}

async function requireSuperAdmin() {
  const { user, role, deactivated } = await getAuthContext();
  if (deactivated) {
    redirect("/login?error=This account has been deactivated.");
  }
  if (!user || !role) {
    redirect("/login");
  }
  if (role !== "admin") {
    redirect(
      `${ROLE_HOME[role]}?error=${encodeURIComponent("You need Super-admin access to change release status.")}`
    );
  }
  return { user, role };
}

function revalidateAssessmentRelease(assessmentKey: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/assessments");
  revalidatePath("/admin/assessments/keystone");
  revalidatePath(firstPartyAdminPath(assessmentKey));
  revalidatePath("/manager");
  revalidatePath("/manager/assessments");
  revalidatePath("/manager/assessments/keystone");
  revalidatePath(`/manager/assessments/${assessmentKey}`);
  revalidatePath("/manager/assessment-reviews/keystone");
  revalidatePath(`/manager/assessment-reviews/${assessmentKey}`);
  revalidatePath("/father");
  revalidatePath("/father/assessments");
  revalidatePath("/father/profile");
  revalidatePath(`/father/assessments/p/${assessmentKey}`);
}

function assessmentPath(assessmentKey: string) {
  if (assessmentKey === KEYSTONE_ASSESSMENT_KEY) return "/admin/assessments/keystone";
  if (isPlatformReviewKey(assessmentKey)) return firstPartyAdminPath(assessmentKey);
  return "/admin/assessments";
}

export async function releaseAssessment(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  const path = assessmentPath(assessmentKey || KEYSTONE_ASSESSMENT_KEY);

  if (!isPlatformReviewKey(assessmentKey)) {
    fail("/admin/assessments", "That assessment was not found.");
  }
  if (!(await allowActionRateLimit("admin.release"))) {
    fail(path, "Too many release actions just now. Try again in a minute.");
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("platform_assessment_releases")
    .select("assessment_key, released_at, first_released_at")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();

  if (currentError && currentError.code !== "PGRST116") {
    const missing =
      currentError.code === "42P01" ||
      currentError.code === "PGRST205" ||
      /platform_assessment_releases/i.test(currentError.message);
    if (missing) {
      fail(path, RELEASE_WRITE_ERROR);
    }
    fail(path, RELEASE_WRITE_ERROR);
  }

  if (!current?.first_released_at && confirm !== RELEASE_CONFIRM) {
    fail(
      path,
      `Type ${RELEASE_CONFIRM} to start Leader review. Organizations you do not include will lose open catalog access.`
    );
  }

  const scope = String(formData.get("release_scope") ?? "all").trim();
  const selectedIds = formData
    .getAll("group_id")
    .map((value) => String(value).trim())
    .filter((value) => UUID.test(value));

  if (scope === "selected" && selectedIds.length === 0) {
    fail(path, "Choose at least one organization, or send to all.");
  }

  const result = await releaseAssessmentToManagers(supabase, {
    assessmentKey,
    releasedBy: user.id,
    groupIds: scope === "selected" ? selectedIds : null,
  });

  if (!result.ok) {
    fail(path, RELEASE_WRITE_ERROR);
  }

  const notice =
    result.targetCount === 0
      ? "No matching organizations to release to."
      : result.newCount === 0
        ? "Those organizations already have this assessment."
        : scope === "selected"
          ? result.newCount === 1
            ? "Released to 1 organization. That Leader was notified."
            : `Released to ${result.newCount} organizations. Eligible Leaders were notified.`
          : result.notified
            ? "Released to all organizations. Eligible Leaders were notified."
            : "Released to all organizations.";

  revalidateAssessmentRelease(assessmentKey);
  finish(path, {
    notice,
    error: result.notifyFailed ? RELEASE_NOTIFY_WARNING : undefined,
  });
}

export async function unreleaseAssessment(formData: FormData) {
  await requireSuperAdmin();
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  const path = assessmentPath(assessmentKey || KEYSTONE_ASSESSMENT_KEY);

  if (!isPlatformReviewKey(assessmentKey)) {
    fail("/admin/assessments", "That assessment was not found.");
  }
  if (!(await allowActionRateLimit("admin.release"))) {
    fail(path, "Too many release actions just now. Try again in a minute.");
  }
  if (confirm !== UNRELEASE_CONFIRM) {
    fail(path, `Type ${UNRELEASE_CONFIRM} to pull this back from Leader review.`);
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("platform_assessment_releases")
    .select("assessment_key, released_at")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();

  if (currentError) {
    fail(path, RELEASE_WRITE_ERROR);
  }
  if (!current?.released_at) {
    redirect(`${path}?notice=${encodeURIComponent("This assessment is not released to Leaders.")}`);
  }

  const result = await unreleaseAssessmentFromManagers(supabase, assessmentKey);
  if (!result.ok) {
    fail(path, RELEASE_WRITE_ERROR);
  }

  revalidateAssessmentRelease(assessmentKey);
  redirect(
    `${path}?notice=${encodeURIComponent("Un-released. Pending reviews were withdrawn. Fathers who already started keep access.")}`
  );
}
