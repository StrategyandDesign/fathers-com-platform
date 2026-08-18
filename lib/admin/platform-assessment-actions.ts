"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ARCHIVE_CONFIRM,
  ARCHIVED_PUBLISH_ERROR,
  ARCHIVED_STATUS_ERROR,
  DEVELOPMENT_NOTES_MAX,
  READY_REQUIRED_ERROR,
  WORKING_TITLE_MAX,
  asDevelopmentStatus,
  isAuthoringStatus,
} from "@/lib/admin/development";
import {
  loadAdminPlatformAssessment,
} from "@/lib/admin/platform-assessment-data";
import {
  PLATFORM_ASSESSMENT_DESCRIPTION_MAX,
  PLATFORM_ASSESSMENT_TITLE_MAX,
  assessmentSlugify,
  firstAssessmentReadyBlocker,
  isArchivedAssessment,
  parseAssessmentSlug,
  parseInstrumentFormValue,
  platformAssessmentKeyFromSlug,
} from "@/lib/admin/platform-assessments";
import {
  RELEASE_CONFIRM,
  UNRELEASE_CONFIRM,
  releaseAssessmentToManagers,
  unreleaseAssessmentFromManagers,
} from "@/lib/admin/assessment-release";
import { ROLE_HOME } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const WRITE_ERROR = "Unable to update this assessment. Please try again.";
const RELEASE_WRITE_ERROR = "Unable to update release status. Please try again.";
const RELEASE_NOTIFY_WARNING =
  "Released, but some Leader emails did not send. They still have the in-app notice.";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
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
      `${ROLE_HOME[role]}?error=${encodeURIComponent("You need Super-admin access to change assessments.")}`
    );
  }
  return { user, role };
}

function revalidatePlatformAssessments(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/assessments");
  if (id) {
    revalidatePath(`/admin/assessments/${id}`);
    revalidatePath(`/admin/assessments/${id}/stage`);
  }
  revalidatePath("/manager");
  revalidatePath("/manager/assessments");
  revalidatePath("/father");
  revalidatePath("/father/assessments");
}

function readCapped(formData: FormData, key: string, max: number, path: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > max) {
    fail(path, `${label} must be ${max} characters or fewer.`);
  }
  return value;
}

export async function createPlatformAssessment(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const title = readCapped(formData, "title", PLATFORM_ASSESSMENT_TITLE_MAX, "/admin/assessments/new", "Title");
  const titleHe = readCapped(
    formData,
    "title_he",
    PLATFORM_ASSESSMENT_TITLE_MAX,
    "/admin/assessments/new",
    "Hebrew title"
  );
  const description = readCapped(
    formData,
    "description",
    PLATFORM_ASSESSMENT_DESCRIPTION_MAX,
    "/admin/assessments/new",
    "Description"
  );
  const descriptionHe = readCapped(
    formData,
    "description_he",
    PLATFORM_ASSESSMENT_DESCRIPTION_MAX,
    "/admin/assessments/new",
    "Hebrew description"
  );
  const workingTitle = readCapped(
    formData,
    "working_title",
    WORKING_TITLE_MAX,
    "/admin/assessments/new",
    "Working title"
  );
  const notes = readCapped(
    formData,
    "development_notes",
    DEVELOPMENT_NOTES_MAX,
    "/admin/assessments/new",
    "Development notes"
  );
  const slugInput = String(formData.get("slug") ?? "").trim();
  const parsedSlug = parseAssessmentSlug(slugInput || assessmentSlugify(title));
  if (!parsedSlug.ok) {
    fail("/admin/assessments/new", parsedSlug.error);
  }
  if (!title) fail("/admin/assessments/new", "Add a title.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_assessments")
    .insert({
      title,
      title_he: titleHe || null,
      description: description || null,
      description_he: descriptionHe || null,
      working_title: workingTitle || null,
      development_notes: notes || null,
      slug: parsedSlug.slug,
      assessment_key: platformAssessmentKeyFromSlug(parsedSlug.slug),
      development_status: "draft",
      created_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error?.code === "23505") {
      fail("/admin/assessments/new", "That slug is already in use. Choose another.");
    }
    fail("/admin/assessments/new", error?.message ?? WRITE_ERROR);
  }

  revalidatePlatformAssessments(data.id);
  ok(`/admin/assessments/${data.id}`, "Draft created. Add weighted domains and questions next.");
}

export async function updatePlatformAssessment(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (isArchivedAssessment(current)) {
    fail(path, "Recover this assessment before editing it.");
  }

  const title = readCapped(formData, "title", PLATFORM_ASSESSMENT_TITLE_MAX, path, "Title");
  const titleHe = readCapped(formData, "title_he", PLATFORM_ASSESSMENT_TITLE_MAX, path, "Hebrew title");
  const description = readCapped(
    formData,
    "description",
    PLATFORM_ASSESSMENT_DESCRIPTION_MAX,
    path,
    "Description"
  );
  const descriptionHe = readCapped(
    formData,
    "description_he",
    PLATFORM_ASSESSMENT_DESCRIPTION_MAX,
    path,
    "Hebrew description"
  );
  const workingTitle = readCapped(formData, "working_title", WORKING_TITLE_MAX, path, "Working title");
  const notes = readCapped(formData, "development_notes", DEVELOPMENT_NOTES_MAX, path, "Development notes");
  if (!title) fail(path, "Add a title.");

  const slugInput = String(formData.get("slug") ?? "").trim();
  const parsedSlug = parseAssessmentSlug(slugInput || current.slug);
  if (!parsedSlug.ok) fail(path, parsedSlug.error);

  const locked = Boolean(current.firstReleasedAt);
  const slug = locked ? current.slug : parsedSlug.slug;
  const assessmentKey = locked ? current.assessment_key : platformAssessmentKeyFromSlug(slug);

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_assessments")
    .update({
      title,
      title_he: titleHe || null,
      description: description || null,
      description_he: descriptionHe || null,
      working_title: workingTitle || null,
      development_notes: notes || null,
      slug,
      assessment_key: assessmentKey,
      development_status:
        current.development_status === "draft" ? "in_development" : current.development_status,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") fail(path, "That slug is already in use. Choose another.");
    fail(path, error.message);
  }

  revalidatePlatformAssessments(id);
  ok(path, "Assessment details saved.");
}

export async function savePlatformInstrument(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (isArchivedAssessment(current)) {
    fail(path, "Recover this assessment before editing it.");
  }

  const parsed = parseInstrumentFormValue(String(formData.get("instrument") ?? ""));
  if (typeof parsed === "string") fail(path, parsed);

  const supabase = await createClient();
  const { data: domains, error: domainLoadError } = await supabase
    .from("platform_assessment_domains")
    .select("id")
    .eq("assessment_id", id);
  if (domainLoadError) fail(path, domainLoadError.message);

  const domainIds = (domains ?? []).map((row) => row.id);
  if (domainIds.length > 0) {
    const { error: itemsError } = await supabase
      .from("platform_assessment_items")
      .delete()
      .in("domain_id", domainIds);
    if (itemsError) fail(path, itemsError.message);
  }

  const { error: deleteDomainsError } = await supabase
    .from("platform_assessment_domains")
    .delete()
    .eq("assessment_id", id);
  if (deleteDomainsError) fail(path, deleteDomainsError.message);

  const { error: deleteBandsError } = await supabase
    .from("platform_assessment_bands")
    .delete()
    .eq("assessment_id", id);
  if (deleteBandsError) fail(path, deleteBandsError.message);

  for (const [domainIndex, domain] of parsed.domains.entries()) {
    const { data: inserted, error: insertDomainError } = await supabase
      .from("platform_assessment_domains")
      .insert({
        assessment_id: id,
        domain_key: domain.key,
        title: domain.title,
        title_he: domain.titleHe || null,
        description: domain.description || null,
        weight: domain.weight,
        sort_order: domainIndex,
      })
      .select("id")
      .maybeSingle();
    if (insertDomainError || !inserted) {
      fail(path, insertDomainError?.message ?? WRITE_ERROR);
    }

    if (domain.items.length === 0) continue;
    const { error: insertItemsError } = await supabase.from("platform_assessment_items").insert(
      domain.items.map((item, itemIndex) => ({
        domain_id: inserted.id,
        prompt: item.prompt,
        prompt_he: item.promptHe || null,
        reverse_scored: item.reverseScored,
        weight: item.weight,
        sort_order: itemIndex,
      }))
    );
    if (insertItemsError) fail(path, insertItemsError.message);
  }

  if (parsed.bands.length > 0) {
    const { error: insertBandsError } = await supabase.from("platform_assessment_bands").insert(
      parsed.bands.map((band, index) => ({
        assessment_id: id,
        min_score: band.minScore,
        max_score: band.maxScore,
        label: band.label,
        label_he: band.labelHe || null,
        description: band.description || null,
        description_he: band.descriptionHe || null,
        sort_order: index,
      }))
    );
    if (insertBandsError) fail(path, insertBandsError.message);
  }

  if (current.development_status === "draft") {
    await supabase
      .from("platform_assessments")
      .update({ development_status: "in_development" })
      .eq("id", id);
  }

  revalidatePlatformAssessments(id);
  ok(path, "Weighted instrument saved. Stage it before Ready.");
}

export async function setPlatformAssessmentStatus(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const status = String(formData.get("development_status") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");
  if (!isAuthoringStatus(status)) fail(path, "Choose a development status.");

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (isArchivedAssessment(current)) fail(path, ARCHIVED_STATUS_ERROR);

  if (status === "ready_for_review") {
    const blocker = firstAssessmentReadyBlocker({
      title: current.title,
      slug: current.slug,
      previewed_at: current.previewed_at,
      instrument: current.instrument,
    });
    if (blocker) fail(path, blocker);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_assessments")
    .update({ development_status: status })
    .eq("id", id);
  if (error) fail(path, error.message);

  revalidatePlatformAssessments(id);
  ok(
    path,
    status === "ready_for_review"
      ? "Marked Ready for Review. Publish, then release to Leaders."
      : `Status set to ${asDevelopmentStatus(status).replaceAll("_", " ")}.`
  );
}

export async function setPlatformAssessmentPublished(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "true";
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (published && isArchivedAssessment(current)) fail(path, ARCHIVED_PUBLISH_ERROR);
  if (published) {
    const blocker = firstAssessmentReadyBlocker({
      title: current.title,
      slug: current.slug,
      previewed_at: current.previewed_at,
      instrument: current.instrument,
    });
    if (blocker) fail(path, blocker);
    if (asDevelopmentStatus(current.development_status) !== "ready_for_review" && !current.releasedAt) {
      fail(path, READY_REQUIRED_ERROR);
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_assessments")
    .update({ published })
    .eq("id", id);
  if (error) fail(path, error.message);

  revalidatePlatformAssessments(id);
  ok(path, published ? "Published. Release is a separate step." : "Unpublished. Existing progress stays.");
}

export async function markPlatformAssessmentPreviewed(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  const hub = `${path}/stage`;
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("platform_assessments")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (loadError) fail(path, loadError.message);
  if (!data) fail("/admin/assessments", "That assessment was not found.");

  const { error } = await supabase
    .from("platform_assessments")
    .update({ previewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail(path, error.message);

  revalidatePlatformAssessments(id);
  redirect(
    `${hub}?notice=${encodeURIComponent("Stage walk recorded. Nothing was saved to Father progress.")}`
  );
}

export async function archivePlatformAssessment(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");
  if (confirm !== ARCHIVE_CONFIRM) {
    fail(path, `Type ${ARCHIVE_CONFIRM} to archive this assessment.`);
  }

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");

  const supabase = await createClient();
  if (current.releasedAt) {
    const result = await unreleaseAssessmentFromManagers(supabase, current.assessment_key);
    if (!result.ok) fail(path, RELEASE_WRITE_ERROR);
  }

  const { error } = await supabase
    .from("platform_assessments")
    .update(
      current.attemptCount > 0
        ? { development_status: "archived" }
        : { development_status: "archived", published: false }
    )
    .eq("id", id);
  if (error) fail(path, error.message);

  revalidatePlatformAssessments(id);
  ok(
    path,
    current.attemptCount > 0
      ? "Archived. Existing progress stays. Hidden from the active catalog."
      : "Archived. Recover it anytime. It is hidden from release flows."
  );
}

export async function recoverPlatformAssessment(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (!isArchivedAssessment(current)) {
    ok(path, "This assessment is already in the active catalog.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_assessments")
    .update({ development_status: "in_development" })
    .eq("id", id);
  if (error) fail(path, error.message);

  revalidatePlatformAssessments(id);
  ok(path, "Recovered to In Development. It is not released again until you choose to.");
}

export async function deletePlatformAssessment(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (current.attemptCount > 0 || current.firstReleasedAt) {
    fail(path, "This assessment already has progress or a release history. Archive it instead.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("platform_assessments").delete().eq("id", id);
  if (error) fail(path, error.message);

  revalidatePlatformAssessments();
  ok("/admin/assessments", "Assessment deleted.");
}

export async function releasePlatformAssessment(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");
  if (!(await allowActionRateLimit("admin.release"))) {
    fail(path, "Too many release actions just now. Try again in a minute.");
  }

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (isArchivedAssessment(current)) {
    fail(path, "Recover this assessment from the archive before releasing it to Leaders.");
  }
  if (!current.published) {
    fail(path, "Publish the assessment first, then release it to organizations.");
  }
  if (!current.releasedAt) {
    const blocker = firstAssessmentReadyBlocker({
      title: current.title,
      slug: current.slug,
      previewed_at: current.previewed_at,
      instrument: current.instrument,
    });
    if (blocker) fail(path, blocker);
    if (asDevelopmentStatus(current.development_status) !== "ready_for_review") {
      fail(path, READY_REQUIRED_ERROR);
    }
  }
  if (current.questionCount < 1) {
    fail(path, "Add at least one question before releasing to organizations.");
  }

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (current.firstReleasedAt && !current.releasedAt && confirm !== RELEASE_CONFIRM) {
    fail(path, `Type ${RELEASE_CONFIRM} to release this assessment again.`);
  }

  const scope = String(formData.get("release_scope") ?? "all").trim();
  const selectedIds = formData
    .getAll("group_id")
    .map((value) => String(value).trim())
    .filter((value) => UUID.test(value));
  if (scope === "selected" && selectedIds.length === 0) {
    fail(path, "Choose at least one organization, or send to all.");
  }

  const supabase = await createClient();
  const result = await releaseAssessmentToManagers(supabase, {
    assessmentKey: current.assessment_key,
    releasedBy: user.id,
    groupIds: scope === "selected" ? selectedIds : null,
    assessmentTitle: current.title,
  });
  if (!result.ok) fail(path, RELEASE_WRITE_ERROR);

  await supabase
    .from("platform_assessments")
    .update({ development_status: "released" })
    .eq("id", id);

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

  revalidatePlatformAssessments(id);
  finish(path, {
    notice,
    error: result.notifyFailed ? RELEASE_NOTIFY_WARNING : undefined,
  });
}

export async function unreleasePlatformAssessment(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("assessment_id") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  const path = id ? `/admin/assessments/${id}` : "/admin/assessments";
  if (!UUID.test(id)) fail("/admin/assessments", "That assessment was not found.");
  if (!(await allowActionRateLimit("admin.release"))) {
    fail(path, "Too many release actions just now. Try again in a minute.");
  }
  if (confirm !== UNRELEASE_CONFIRM) {
    fail(path, `Type ${UNRELEASE_CONFIRM} to pull this back from Leader review.`);
  }

  const current = await loadAdminPlatformAssessment(id);
  if (!current) fail("/admin/assessments", "That assessment was not found.");
  if (!current.releasedAt) {
    redirect(`${path}?notice=${encodeURIComponent("This assessment is not released to Leaders.")}`);
  }

  const supabase = await createClient();
  const result = await unreleaseAssessmentFromManagers(supabase, current.assessment_key);
  if (!result.ok) fail(path, RELEASE_WRITE_ERROR);

  await supabase
    .from("platform_assessments")
    .update({
      development_status: current.published ? "ready_for_review" : "in_development",
    })
    .eq("id", id);

  revalidatePlatformAssessments(id);
  redirect(
    `${path}?notice=${encodeURIComponent("Un-released. Pending reviews were withdrawn. Fathers who already started keep access.")}`
  );
}
