"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ARCHIVE_CONFIRM,
  ARCHIVE_RELEASE_ERROR,
  ARCHIVED_PUBLISH_ERROR,
  ARCHIVED_STATUS_ERROR,
  DEVELOPMENT_NOTES_MAX,
  READY_REQUIRED_ERROR,
  SKILL_PROMPT_MAX,
  WORKING_TITLE_MAX,
  archiveHasLiveUsage,
  asDevelopmentStatus,
  composeSkillPrompt,
  firstReadyBlocker,
  isArchivedTraining,
  isAuthoringStatus,
} from "@/lib/admin/development";
import { slugify } from "@/lib/admin/slug";
import { loadSessionUsage, loadTrainingUsage } from "@/lib/admin/data";
import {
  isLegacyCatalogTraining,
  RELEASE_CONFIRM,
  releaseTrainingToManagers,
  seedGroupTrainingReviews,
  UNRELEASE_CONFIRM,
  unreleaseTrainingFromManagers,
} from "@/lib/admin/release";
import { seedGroupAssessmentReviews } from "@/lib/admin/assessment-release";
import { hasHardcodedSkillPack } from "@/lib/father/session-questions";
import { isAppRole, ROLE_HOME } from "@/lib/auth/roles";
import { getAuthContext, requireRole } from "@/lib/auth/session";
import { youtubeVideoId } from "@/lib/father/types";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  FILM_DURATION_FORMAT_ERROR,
  FILM_RUNTIME_MISSING,
  canStoreOverLengthDuration,
  filmOverageMessage,
  filmRuntimeErrorMessage,
  firstFilmPublishError,
  isOverLengthFilm,
  parseDurationInput,
} from "@/lib/trainings/runtime";
import { fetchYoutubeDurationSeconds } from "@/lib/trainings/youtube-duration";

const YOUTUBE_URL_ERROR =
  "Use a YouTube video link. Playlists and other sites will not play.";

const RELEASE_WRITE_ERROR = "Unable to update release status. Please try again.";
const RELEASE_NOTIFY_WARNING =
  "Some manager emails didn’t send. The training is still released for review.";

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
      `${ROLE_HOME[role]}?error=${encodeURIComponent("You need Super-admin access to change release status.")}`
    );
  }
  return { user, role };
}

function revalidateAdmin(extra?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/trainings");
  revalidatePath("/admin/assessments");
  revalidatePath("/admin/users");
  revalidatePath("/manager");
  revalidatePath("/manager/reviews");
  revalidatePath("/manager/trainings");
  revalidatePath("/manager/assessments");
  revalidatePath("/manager/participants");
  revalidatePath("/father");
  revalidatePath("/father/trainings");
  if (extra) revalidatePath(extra);
}

function readInt(formData: FormData, key: string, fallback: number) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function readCappedText(
  formData: FormData,
  key: string,
  max: number,
  path: string,
  label: string
) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > max) {
    fail(path, `${label} must be ${max} characters or fewer.`);
  }
  return value;
}

function readSkillPrompt(formData: FormData, prefix: string, path: string, label: string) {
  const composed = composeSkillPrompt({
    stem: String(formData.get(`${prefix}_stem`) ?? ""),
    a: String(formData.get(`${prefix}_a`) ?? ""),
    b: String(formData.get(`${prefix}_b`) ?? ""),
    c: String(formData.get(`${prefix}_c`) ?? ""),
  });
  if (composed && composed.length > SKILL_PROMPT_MAX) {
    fail(path, `${label} must be ${SKILL_PROMPT_MAX} characters or fewer.`);
  }
  return composed;
}

async function loadTrainingChecklistRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trainingId: string,
  path: string
) {
  const [trainingRes, sessionsRes] = await Promise.all([
    supabase.from("trainings").select("*").eq("id", trainingId).maybeSingle(),
    supabase.from("sessions").select("*").eq("training_id", trainingId).order("order_index"),
  ]);
  if (trainingRes.error) fail(path, trainingRes.error.message);
  if (sessionsRes.error) fail(path, sessionsRes.error.message);
  if (!trainingRes.data) fail("/admin/trainings", "Training not found.");
  return {
    ...trainingRes.data,
    sessions: sessionsRes.data ?? [],
  };
}

function readyBlockerFor(training: Awaited<ReturnType<typeof loadTrainingChecklistRow>>) {
  return firstReadyBlocker(training, {
    sessionHasHardcoded: (session) => hasHardcodedSkillPack(session, training),
  });
}

async function bumpDraftToInDevelopment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trainingId: string
) {
  const { error } = await supabase
    .from("trainings")
    .update({ development_status: "in_development" })
    .eq("id", trainingId)
    .eq("development_status", "draft");
  if (error) throw error;
}

async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, title: string, currentId?: string) {
  const base = slugify(title);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("trainings")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.id === currentId) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function failDb(path: string, error: { message?: string }, fallback: string): never {
  fail(path, filmRuntimeErrorMessage(error.message) ?? error.message ?? fallback);
}

async function assertTrainingFilmsPublishable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trainingId: string,
  path: string
) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, video_url, duration_seconds")
    .eq("training_id", trainingId);
  if (error) fail(path, error.message);
  const filmError = firstFilmPublishError(data ?? []);
  if (filmError) fail(path, filmError);
}

async function resolveSessionDuration(videoUrl: string, rawDuration: string) {
  const parsed = parseDurationInput(rawDuration);
  if (parsed === "invalid") return "invalid" as const;
  const videoId = youtubeVideoId(videoUrl);
  if (videoId) {
    const fetched = await fetchYoutubeDurationSeconds(videoId);
    if (fetched != null) return fetched;
  }
  return parsed;
}

function assertLiveSessionDuration(
  path: string,
  duration: number | null,
  previous: number | null | undefined
) {
  if (duration == null) fail(path, FILM_RUNTIME_MISSING);
  if (isOverLengthFilm(duration) && !canStoreOverLengthDuration(duration, previous)) {
    fail(path, filmOverageMessage(duration));
  }
}

async function trainingIsLive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trainingId: string,
  path: string
) {
  const { data, error } = await supabase
    .from("trainings")
    .select("published, released_at")
    .eq("id", trainingId)
    .maybeSingle();
  if (error) fail(path, error.message);
  return Boolean(data?.published || data?.released_at);
}

async function syncSessionCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trainingId: string
) {
  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("training_id", trainingId);
  if (error) throw error;
  const { error: updateError } = await supabase
    .from("trainings")
    .update({ session_count: count ?? 0 })
    .eq("id", trainingId);
  if (updateError) throw updateError;
}

export async function createOrganization(formData: FormData) {
  await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const managerId = String(formData.get("manager_id") ?? "").trim();

  if (!name) fail("/admin/organizations/new", "Name is required.");
  if (!managerId) fail("/admin/organizations/new", "Choose a manager.");

  const supabase = await createClient();
  const { data: manager, error: managerError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", managerId)
    .maybeSingle();

  if (managerError) fail("/admin/organizations/new", managerError.message);
  if (!manager || manager.role !== "manager") {
    fail("/admin/organizations/new", "That user is not a manager. Change their role first.");
  }

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      manager_id: managerId,
    })
    .select("id")
    .single();

  if (error) fail("/admin/organizations/new", error.message);
  if (data?.id) {
    await seedGroupTrainingReviews(supabase, data.id);
    await seedGroupAssessmentReviews(supabase, data.id);
  }

  revalidateAdmin();
  ok("/admin/organizations", "Organization created.");
}

export async function updateOrganization(formData: FormData) {
  await requireRole("admin");
  const groupId = String(formData.get("group_id") ?? "");
  const path = `/admin/organizations/${groupId}`;
  const name = String(formData.get("name") ?? "").trim();
  const managerId = String(formData.get("manager_id") ?? "").trim();

  if (!groupId) fail("/admin/organizations", "Choose an organization.");
  if (!name) fail(path, "Name is required.");
  if (!managerId) fail(path, "Choose a manager.");

  const supabase = await createClient();
  const { data: manager, error: managerError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", managerId)
    .maybeSingle();

  if (managerError) fail(path, managerError.message);
  if (!manager || manager.role !== "manager") {
    fail(path, "That user is not a manager. Change their role first.");
  }

  const { error } = await supabase
    .from("groups")
    .update({ name, manager_id: managerId })
    .eq("id", groupId);

  if (error) fail(path, error.message);

  revalidateAdmin(path);
  ok(path, "Organization updated.");
}

export async function deleteOrganization(formData: FormData) {
  await requireRole("admin");
  const groupId = String(formData.get("group_id") ?? "");
  const path = `/admin/organizations/${groupId}`;

  if (!groupId) fail("/admin/organizations", "Choose an organization.");

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("group_members")
    .select("father_id", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (countError) fail(path, countError.message);
  if ((count ?? 0) > 0) {
    fail(path, "Remove or move participants before deleting this organization.");
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) fail(path, error.message);

  revalidateAdmin();
  ok("/admin/organizations", "Organization deleted.");
}

export async function createTraining(formData: FormData) {
  await requireRole("admin");
  const path = "/admin/trainings/new";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "true";
  const orderIndex = readInt(formData, "order_index", 0);
  const requestedSlug = slugify(String(formData.get("slug") ?? "").trim() || title);
  const workingTitle = readCappedText(
    formData,
    "working_title",
    WORKING_TITLE_MAX,
    path,
    "Working title"
  );
  const developmentNotes = readCappedText(
    formData,
    "development_notes",
    DEVELOPMENT_NOTES_MAX,
    path,
    "Development notes"
  );

  if (!title) fail(path, "Title is required.");

  const supabase = await createClient();
  let slug = requestedSlug;
  try {
    slug = await uniqueSlug(supabase, requestedSlug);
  } catch (error) {
    fail(path, error instanceof Error ? error.message : "Could not create a slug.");
  }

  const { data, error } = await supabase
    .from("trainings")
    .insert({
      title,
      slug,
      description: description || null,
      published,
      order_index: orderIndex,
      session_count: 0,
      development_status: "draft",
      working_title: workingTitle || null,
      development_notes: developmentNotes || null,
    })
    .select("id")
    .single();

  if (error) fail(path, error.message);
  if (!data) fail(path, "Could not create the training.");

  revalidateAdmin(`/admin/trainings/${data.id}`);
  ok(`/admin/trainings/${data.id}`, "Draft created. Add sessions and Stage it before release.");
}

export async function updateTraining(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const path = `/admin/trainings/${trainingId}`;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "true";
  const orderIndex = readInt(formData, "order_index", 0);
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const workingTitle = readCappedText(
    formData,
    "working_title",
    WORKING_TITLE_MAX,
    path,
    "Working title"
  );
  const developmentNotes = readCappedText(
    formData,
    "development_notes",
    DEVELOPMENT_NOTES_MAX,
    path,
    "Development notes"
  );

  if (!trainingId) fail("/admin/trainings", "Choose a training.");
  if (!title) fail(path, "Title is required.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("id, slug, published, development_status")
    .eq("id", trainingId)
    .maybeSingle();

  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings", "Training not found.");

  if (published) {
    if (isArchivedTraining(current)) fail(path, ARCHIVED_PUBLISH_ERROR);
    if (current.published !== true) {
      await assertTrainingFilmsPublishable(supabase, trainingId, path);
    }
  }

  const lockedSlug = current.slug === "fundamentals";
  let slug = current.slug;
  if (!lockedSlug && requestedSlug) {
    try {
      slug = await uniqueSlug(supabase, requestedSlug, trainingId);
    } catch (error) {
      fail(path, error instanceof Error ? error.message : "Could not update the slug.");
    }
  }

  const { error } = await supabase
    .from("trainings")
    .update({
      title,
      slug,
      description: description || null,
      published,
      order_index: orderIndex,
      working_title: workingTitle || null,
      development_notes: developmentNotes || null,
    })
    .eq("id", trainingId);

  if (error) failDb(path, error, error.message);

  revalidateAdmin(path);
  ok(path, published ? "Training saved and published." : "Training saved. It is hidden from new assignment.");
}

export async function setTrainingPublished(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const published = String(formData.get("published") ?? "") === "true";
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId) fail("/admin/trainings", "Choose a training.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("development_status")
    .eq("id", trainingId)
    .maybeSingle();
  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings", "Training not found.");
  if (published) {
    if (isArchivedTraining(current)) fail(path, ARCHIVED_PUBLISH_ERROR);
    await assertTrainingFilmsPublishable(supabase, trainingId, path);
  }
  const { error } = await supabase.from("trainings").update({ published }).eq("id", trainingId);
  if (error) failDb(path, error, error.message);

  revalidateAdmin(path);
  ok(path, published ? "Training published." : "Training unpublished. Existing progress stays reachable.");
}

export async function releaseTraining(formData: FormData) {
  const { user } = await requireSuperAdmin();
  const trainingId = String(formData.get("training_id") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  const path = trainingId ? `/admin/trainings/${trainingId}` : "/admin/trainings";

  if (!trainingId) fail("/admin/trainings", "That training was not found.");
  if (!(await allowActionRateLimit("admin.release"))) {
    fail(path, "Too many release actions just now. Try again in a minute.");
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("id, title, published, released_at, first_published_at, first_released_at, session_count, development_status")
    .eq("id", trainingId)
    .maybeSingle();

  if (currentError) fail(path, RELEASE_WRITE_ERROR);
  if (!current) fail("/admin/trainings", "That training was not found.");
  if (isArchivedTraining(current)) fail(path, ARCHIVE_RELEASE_ERROR);
  if (current.published !== true) {
    fail(path, "Publish the training first, then release it to organizations.");
  }
  if (!current.released_at) {
    const checklist = await loadTrainingChecklistRow(supabase, trainingId, path);
    const blocker = readyBlockerFor(checklist);
    if (blocker) fail(path, blocker);
    if (asDevelopmentStatus(current.development_status) !== "ready_for_review") {
      fail(path, READY_REQUIRED_ERROR);
    }
  }

  const { count, error: countError } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("training_id", trainingId);
  if (countError) fail(path, RELEASE_WRITE_ERROR);
  if ((count ?? current.session_count ?? 0) < 1) {
    fail(path, "Add at least one session before releasing to organizations.");
  }
  if (!current.released_at) {
    await assertTrainingFilmsPublishable(supabase, trainingId, path);
  }

  if (!current.released_at && isLegacyCatalogTraining(current) && confirm !== RELEASE_CONFIRM) {
    fail(path, `Type ${RELEASE_CONFIRM} to release a catalog training. Managers must accept it before they can assign it.`);
  }

  const scope = String(formData.get("release_scope") ?? "all").trim();
  const selectedIds = formData
    .getAll("group_id")
    .map((value) => String(value).trim())
    .filter((value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    );

  if (scope === "selected" && selectedIds.length === 0) {
    fail(path, "Choose at least one organization, or send to all.");
  }

  const result = await releaseTrainingToManagers(supabase, {
    trainingId,
    trainingTitle: current.title,
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
        ? "Those organizations already have this training."
        : scope === "selected"
          ? result.newCount === 1
            ? "Released to 1 organization. That manager was notified."
            : `Released to ${result.newCount} organizations. Eligible managers were notified.`
          : result.notified
            ? "Released to all organizations. Eligible managers were notified."
            : "Released to all organizations.";

  const { error: statusError } = await supabase
    .from("trainings")
    .update({ development_status: "released" })
    .eq("id", trainingId);
  if (statusError) {
    console.error("[release] development status update failed", statusError.message);
  }

  revalidateAdmin(path);
  finish(path, {
    notice,
    error: result.notifyFailed ? RELEASE_NOTIFY_WARNING : undefined,
  });
}

export async function unreleaseTraining(formData: FormData) {
  await requireSuperAdmin();
  const trainingId = String(formData.get("training_id") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  const path = trainingId ? `/admin/trainings/${trainingId}` : "/admin/trainings";

  if (!trainingId) fail("/admin/trainings", "That training was not found.");
  if (!(await allowActionRateLimit("admin.release"))) {
    fail(path, "Too many release actions just now. Try again in a minute.");
  }
  if (confirm !== UNRELEASE_CONFIRM) {
    fail(path, `Type ${UNRELEASE_CONFIRM} to pull this back from manager review.`);
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("id, released_at, published, development_status")
    .eq("id", trainingId)
    .maybeSingle();

  if (currentError) fail(path, RELEASE_WRITE_ERROR);
  if (!current) fail("/admin/trainings", "That training was not found.");
  if (!current.released_at) {
    ok(path, "This training is not released to managers.");
  }

  const result = await unreleaseTrainingFromManagers(supabase, trainingId);
  if (!result.ok) {
    fail(path, RELEASE_WRITE_ERROR);
  }

  if (!isArchivedTraining(current)) {
    const { error: statusError } = await supabase
      .from("trainings")
      .update({
        development_status: current.published ? "ready_for_review" : "in_development",
      })
      .eq("id", trainingId);
    if (statusError) {
      console.error("[unrelease] development status update failed", statusError.message);
    }
  }

  revalidateAdmin(path);
  ok(path, "Un-released. Pending reviews were withdrawn. Existing assignments stay.");
}

export async function deleteTraining(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId) fail("/admin/trainings", "Choose a training.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("slug")
    .eq("id", trainingId)
    .maybeSingle();

  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings", "Training not found.");
  if (current.slug === "fundamentals") {
    fail(path, "Fathering Fundamentals cannot be deleted. Unpublish it instead.");
  }

  try {
    const usage = await loadTrainingUsage(trainingId);
    if (usage.assignmentCount + usage.progressCount + usage.certificateCount > 0) {
      fail(path, "This training has assignments or progress. Unpublish it instead.");
    }
  } catch (error) {
    fail(path, error instanceof Error ? error.message : "Could not check training usage.");
  }

  const { error } = await supabase.from("trainings").delete().eq("id", trainingId);
  if (error) fail(path, error.message);

  revalidateAdmin();
  ok("/admin/trainings", "Training deleted.");
}

export async function createSession(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const path = `/admin/trainings/${trainingId}`;
  const title = String(formData.get("title") ?? "").trim();
  const keyline = String(formData.get("keyline") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  const sessionNumber = readInt(formData, "session_number", 0);
  const orderIndex = readInt(formData, "order_index", sessionNumber);
  const duration = await resolveSessionDuration(
    videoUrl,
    String(formData.get("duration_seconds") ?? "")
  );
  const checkinPrompt = readSkillPrompt(formData, "checkin", path, "Check-in");
  const actionPrompt = readSkillPrompt(formData, "action", path, "Action");

  if (!trainingId) fail("/admin/trainings", "Choose a training.");
  if (!title) fail(path, "Session title is required.");
  if (sessionNumber < 1) fail(path, "Session number must be 1 or higher.");
  if (videoUrl && !youtubeVideoId(videoUrl)) fail(path, YOUTUBE_URL_ERROR);
  if (duration === "invalid") fail(path, FILM_DURATION_FORMAT_ERROR);

  const supabase = await createClient();
  if (await trainingIsLive(supabase, trainingId, path)) {
    assertLiveSessionDuration(path, duration, null);
  }

  const { error } = await supabase.from("sessions").insert({
    training_id: trainingId,
    title,
    keyline: keyline || null,
    video_url: videoUrl || null,
    session_number: sessionNumber,
    order_index: orderIndex,
    duration_seconds: duration,
    checkin_prompt: checkinPrompt,
    action_prompt: actionPrompt,
  });

  if (error) failDb(path, error, error.message);

  try {
    await syncSessionCount(supabase, trainingId);
    await bumpDraftToInDevelopment(supabase, trainingId);
  } catch (syncError) {
    fail(path, syncError instanceof Error ? syncError.message : "Session saved, but the count could not update.");
  }

  revalidateAdmin(path);
  ok(path, "Session added. Incomplete sessions can stay in Draft until you are ready.");
}

export async function updateSession(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const path = `/admin/trainings/${trainingId}`;
  const title = String(formData.get("title") ?? "").trim();
  const keyline = String(formData.get("keyline") ?? "").trim();
  const videoUrl = String(formData.get("video_url") ?? "").trim();
  const sessionNumber = readInt(formData, "session_number", 0);
  const orderIndex = readInt(formData, "order_index", sessionNumber);
  const duration = await resolveSessionDuration(
    videoUrl,
    String(formData.get("duration_seconds") ?? "")
  );
  const checkinPrompt = readSkillPrompt(formData, "checkin", path, "Check-in");
  const actionPrompt = readSkillPrompt(formData, "action", path, "Action");

  if (!trainingId || !sessionId) fail(path || "/admin/trainings", "Choose a session.");
  if (!title) fail(path, "Session title is required.");
  if (sessionNumber < 1) fail(path, "Session number must be 1 or higher.");
  if (videoUrl && !youtubeVideoId(videoUrl)) fail(path, YOUTUBE_URL_ERROR);
  if (duration === "invalid") fail(path, FILM_DURATION_FORMAT_ERROR);

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("duration_seconds")
    .eq("id", sessionId)
    .eq("training_id", trainingId)
    .maybeSingle();
  if (existingError) fail(path, existingError.message);
  if (await trainingIsLive(supabase, trainingId, path)) {
    assertLiveSessionDuration(path, duration, existing?.duration_seconds);
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      title,
      keyline: keyline || null,
      video_url: videoUrl || null,
      session_number: sessionNumber,
      order_index: orderIndex,
      duration_seconds: duration,
      checkin_prompt: checkinPrompt,
      action_prompt: actionPrompt,
    })
    .eq("id", sessionId)
    .eq("training_id", trainingId);

  if (error) failDb(path, error, error.message);

  revalidateAdmin(path);
  ok(path, "Session updated.");
}

export async function deleteSession(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId || !sessionId) fail(path || "/admin/trainings", "Choose a session.");

  try {
    const usage = await loadSessionUsage(sessionId);
    if (usage > 0) {
      fail(path, "This session has progress and cannot be deleted.");
    }
  } catch (error) {
    fail(path, error instanceof Error ? error.message : "Could not check session usage.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("training_id", trainingId);

  if (error) fail(path, error.message);

  try {
    await syncSessionCount(supabase, trainingId);
  } catch (syncError) {
    fail(path, syncError instanceof Error ? syncError.message : "Session deleted, but the count could not update.");
  }

  revalidateAdmin(path);
  ok(path, "Session deleted.");
}

export async function duplicateSession(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId || !sessionId) fail(path || "/admin/trainings", "Choose a session.");

  const supabase = await createClient();
  const { data: sessions, error: listError } = await supabase
    .from("sessions")
    .select("*")
    .eq("training_id", trainingId)
    .order("order_index");
  if (listError) fail(path, listError.message);

  const source = (sessions ?? []).find((row) => row.id === sessionId);
  if (!source) fail(path, "Session not found.");

  const nextNumber =
    (sessions ?? []).reduce((max, row) => Math.max(max, row.session_number), 0) + 1;
  const nextOrder =
    (sessions ?? []).reduce((max, row) => Math.max(max, row.order_index), 0) + 1;

  const { error } = await supabase.from("sessions").insert({
    training_id: trainingId,
    title: source.title.endsWith("(copy)") ? source.title : `${source.title} (copy)`,
    keyline: source.keyline,
    video_url: source.video_url,
    session_number: nextNumber,
    order_index: nextOrder,
    duration_seconds: source.duration_seconds,
    checkin_prompt: source.checkin_prompt,
    action_prompt: source.action_prompt,
  });
  if (error) failDb(path, error, error.message);

  try {
    await syncSessionCount(supabase, trainingId);
    await bumpDraftToInDevelopment(supabase, trainingId);
  } catch (syncError) {
    fail(path, syncError instanceof Error ? syncError.message : "Session copied, but the count could not update.");
  }

  revalidateAdmin(path);
  ok(path, "Session duplicated. Review the copy before marking Ready.");
}

export async function moveSession(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId || !sessionId) fail(path || "/admin/trainings", "Choose a session.");
  if (direction !== "up" && direction !== "down") {
    fail(path, "Choose whether to move the session up or down.");
  }

  const supabase = await createClient();
  const { data: sessions, error: listError } = await supabase
    .from("sessions")
    .select("id, session_number, order_index")
    .eq("training_id", trainingId)
    .order("order_index")
    .order("session_number");
  if (listError) fail(path, listError.message);

  const ordered = [...(sessions ?? [])].sort(
    (a, b) => a.order_index - b.order_index || a.session_number - b.session_number
  );
  const index = ordered.findIndex((row) => row.id === sessionId);
  if (index < 0) fail(path, "Session not found.");
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  const current = ordered[index];
  const neighbor = ordered[neighborIndex];
  if (!neighbor) {
    ok(path, "Session is already at the end of the list.");
  }

  const tempNumber = 10_000 + current.session_number;
  const first = await supabase
    .from("sessions")
    .update({ session_number: tempNumber })
    .eq("id", current.id)
    .eq("training_id", trainingId);
  if (first.error) failDb(path, first.error, first.error.message);

  const second = await supabase
    .from("sessions")
    .update({
      session_number: current.session_number,
      order_index: current.order_index,
    })
    .eq("id", neighbor.id)
    .eq("training_id", trainingId);
  if (second.error) failDb(path, second.error, second.error.message);

  const third = await supabase
    .from("sessions")
    .update({
      session_number: neighbor.session_number,
      order_index: neighbor.order_index,
    })
    .eq("id", current.id)
    .eq("training_id", trainingId);
  if (third.error) failDb(path, third.error, third.error.message);

  revalidateAdmin(path);
  ok(path, "Session order updated.");
}

export async function setDevelopmentStatus(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const status = String(formData.get("development_status") ?? "").trim();
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId) fail("/admin/trainings", "Choose a training.");
  if (!isAuthoringStatus(status)) {
    fail(path, "Choose Draft, In Development, or Ready for Review.");
  }

  const supabase = await createClient();
  const current = await loadTrainingChecklistRow(supabase, trainingId, path);
  if (isArchivedTraining(current)) fail(path, ARCHIVED_STATUS_ERROR);

  if (status === "ready_for_review") {
    const blocker = readyBlockerFor(current);
    if (blocker) fail(path, blocker);
  }

  const { error } = await supabase
    .from("trainings")
    .update({ development_status: status })
    .eq("id", trainingId);
  if (error) fail(path, error.message);

  revalidateAdmin(path);
  ok(
    path,
    status === "ready_for_review"
      ? "Marked Ready for Review. Publish, then release to Leaders when you want them to see it."
      : `Saved as ${status === "draft" ? "Draft" : "In Development"}.`
  );
}

export async function archiveTraining(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId) fail("/admin/trainings", "Choose a training.");
  if (confirm !== ARCHIVE_CONFIRM) {
    fail(path, `Type ${ARCHIVE_CONFIRM} to archive this training.`);
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("id, released_at, development_status")
    .eq("id", trainingId)
    .maybeSingle();
  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings", "Training not found.");

  let usage;
  try {
    usage = await loadTrainingUsage(trainingId);
  } catch (error) {
    fail(path, error instanceof Error ? error.message : "Could not check training usage.");
  }

  const live = archiveHasLiveUsage(usage);
  if (!live && current.released_at) {
    const result = await unreleaseTrainingFromManagers(supabase, trainingId);
    if (!result.ok) fail(path, RELEASE_WRITE_ERROR);
  }

  const { error } = await supabase
    .from("trainings")
    .update(
      live
        ? { development_status: "archived" }
        : { development_status: "archived", published: false }
    )
    .eq("id", trainingId);
  if (error) fail(path, error.message);

  revalidateAdmin();
  ok(
    `/admin/trainings/${trainingId}`,
    live
      ? "Archived. Existing assignments and progress stay. Hidden from the active catalog."
      : "Archived. Recover it anytime. It is hidden from release flows."
  );
}

export async function recoverTraining(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const path = `/admin/trainings/${trainingId}`;

  if (!trainingId) fail("/admin/trainings", "Choose a training.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("id, development_status")
    .eq("id", trainingId)
    .maybeSingle();
  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings", "Training not found.");
  if (!isArchivedTraining(current)) {
    ok(path, "This training is already in the active catalog.");
  }

  const { error } = await supabase
    .from("trainings")
    .update({ development_status: "in_development" })
    .eq("id", trainingId);
  if (error) fail(path, error.message);

  revalidateAdmin(path);
  ok(path, "Recovered to In Development. It is not released again until you choose to.");
}

export async function markTrainingPreviewed(formData: FormData) {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const path = trainingId ? `/admin/trainings/${trainingId}` : "/admin/trainings";
  const hub = `${path}/stage`;

  if (!trainingId) fail("/admin/trainings", "Choose a training.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("id")
    .eq("id", trainingId)
    .maybeSingle();
  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings", "Training not found.");

  const { error } = await supabase
    .from("trainings")
    .update({ previewed_at: new Date().toISOString() })
    .eq("id", trainingId);
  if (error) fail(path, error.message);

  revalidateAdmin(path);
  const walked = sessionId ? `&walked=${encodeURIComponent(sessionId)}` : "";
  redirect(
    `${hub}?notice=${encodeURIComponent("Stage walk recorded. Nothing was saved to Father progress.")}${walked}`
  );
}

export async function changeUserRole(formData: FormData) {
  const { user } = await requireRole("admin");
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const path = `/admin/users/${userId}`;

  if (!userId) fail("/admin/users", "Choose a user.");
  if (!isAppRole(role)) {
    fail(path, "Choose a valid role.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_role", {
    target_id: userId,
    new_role: role,
  });

  if (error) fail(path, error.message);

  revalidateAdmin(path);
  if (userId === user.id) {
    redirect(`/login?notice=${encodeURIComponent("Your role changed. Sign in again.")}`);
  }
  ok(path, "Role updated. They need to sign in again.");
}

export async function setUserDeactivated(formData: FormData) {
  await requireRole("admin");
  const userId = String(formData.get("user_id") ?? "");
  const deactivated = String(formData.get("deactivated") ?? "") === "true";
  const path = `/admin/users/${userId}`;

  if (!userId) fail("/admin/users", "Choose a user.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_deactivated", {
    target_id: userId,
    deactivated,
  });

  if (error) fail(path, error.message);

  revalidateAdmin(path);
  ok(path, deactivated ? "Account deactivated." : "Account reactivated.");
}
