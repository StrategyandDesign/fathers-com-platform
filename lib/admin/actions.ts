"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
import { isAppRole, ROLE_HOME } from "@/lib/auth/roles";
import { getAuthContext, requireRole } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/admin/users");
  revalidatePath("/manager");
  revalidatePath("/manager/reviews");
  revalidatePath("/manager/trainings");
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
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const published = String(formData.get("published") ?? "") === "true";
  const orderIndex = readInt(formData, "order_index", 0);
  const requestedSlug = slugify(String(formData.get("slug") ?? "").trim() || title);

  if (!title) fail("/admin/trainings/new", "Title is required.");

  const supabase = await createClient();
  let slug = requestedSlug;
  try {
    slug = await uniqueSlug(supabase, requestedSlug);
  } catch (error) {
    fail("/admin/trainings/new", error instanceof Error ? error.message : "Could not create a slug.");
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
    })
    .select("id")
    .single();

  if (error) fail("/admin/trainings/new", error.message);
  if (!data) fail("/admin/trainings/new", "Could not create the training.");

  revalidateAdmin(`/admin/trainings/${data.id}`);
  ok(`/admin/trainings/${data.id}`, "Training created.");
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

  if (!trainingId) fail("/admin/trainings", "Choose a training.");
  if (!title) fail(path, "Title is required.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("trainings")
    .select("id, slug")
    .eq("id", trainingId)
    .maybeSingle();

  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings", "Training not found.");

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
    })
    .eq("id", trainingId);

  if (error) fail(path, error.message);

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
  const { error } = await supabase.from("trainings").update({ published }).eq("id", trainingId);
  if (error) fail(path, error.message);

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
    .select("id, title, published, released_at, first_published_at, first_released_at, session_count")
    .eq("id", trainingId)
    .maybeSingle();

  if (currentError) fail(path, RELEASE_WRITE_ERROR);
  if (!current) fail("/admin/trainings", "That training was not found.");
  if (current.published !== true) {
    fail(path, "Publish the training first, then release it to organizations.");
  }

  const { count, error: countError } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("training_id", trainingId);
  if (countError) fail(path, RELEASE_WRITE_ERROR);
  if ((count ?? current.session_count ?? 0) < 1) {
    fail(path, "Add at least one session before releasing to organizations.");
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
    .select("id, released_at")
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

  if (!trainingId) fail("/admin/trainings", "Choose a training.");
  if (!title) fail(path, "Session title is required.");
  if (sessionNumber < 1) fail(path, "Session number must be 1 or higher.");

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").insert({
    training_id: trainingId,
    title,
    keyline: keyline || null,
    video_url: videoUrl || null,
    session_number: sessionNumber,
    order_index: orderIndex,
  });

  if (error) fail(path, error.message);

  try {
    await syncSessionCount(supabase, trainingId);
  } catch (syncError) {
    fail(path, syncError instanceof Error ? syncError.message : "Session saved, but the count could not update.");
  }

  revalidateAdmin(path);
  ok(path, "Session added.");
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

  if (!trainingId || !sessionId) fail(path || "/admin/trainings", "Choose a session.");
  if (!title) fail(path, "Session title is required.");
  if (sessionNumber < 1) fail(path, "Session number must be 1 or higher.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({
      title,
      keyline: keyline || null,
      video_url: videoUrl || null,
      session_number: sessionNumber,
      order_index: orderIndex,
    })
    .eq("id", sessionId)
    .eq("training_id", trainingId);

  if (error) fail(path, error.message);

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
