"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { slugify } from "@/lib/admin/slug";
import {
  ATTRIBUTION_MAX,
  INTAKE_AUDIENCE_MAX,
  INTAKE_OUTLINE_MAX,
  INTAKE_RIGHTS_NOTES_MAX,
  INTAKE_TITLE_MAX,
  SOURCE_CHANNEL_MAX,
  SOURCE_CONTACT_MAX,
  SOURCE_EMAIL_MAX,
  SOURCE_NAME_MAX,
  SOURCE_NOTES_MAX,
  isHttpUrl,
  isIntakeStatus,
  isRightsStatus,
  isSimpleEmail,
  parseSessionOutline,
} from "@/lib/admin/sourcing";
import { requireRole } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { fetchYoutubeDurationSeconds } from "@/lib/trainings/youtube-duration";
import { youtubeVideoId } from "@/lib/father/types";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function readCapped(formData: FormData, key: string, max: number, path: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > max) fail(path, `${label} must be ${max} characters or fewer.`);
  return value;
}

function revalidateSourcing(extra?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/trainings");
  revalidatePath("/admin/trainings/sources");
  revalidatePath("/admin/support/requests");
  if (extra) revalidatePath(extra);
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string
) {
  const base = slugify(title);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("trainings")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function requireSourcing(path: string) {
  await requireRole("admin");
  if (!(await allowActionRateLimit("admin.sourcing"))) {
    fail(path, "Too many sourcing actions just now. Try again in a minute.");
  }
}

async function upsertSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  path: string,
  userId: string
) {
  const existingId = String(formData.get("source_id") ?? "").trim();
  if (existingId) {
    const { data, error } = await supabase
      .from("training_sources")
      .select("id, name")
      .eq("id", existingId)
      .maybeSingle();
    if (error) fail(path, error.message);
    if (!data) fail(path, "That source was not found.");
    return data as { id: string; name: string };
  }

  const name = readCapped(formData, "source_name", SOURCE_NAME_MAX, path, "Source name");
  const contactName = readCapped(formData, "contact_name", SOURCE_CONTACT_MAX, path, "Contact name");
  const contactEmail = readCapped(formData, "contact_email", SOURCE_EMAIL_MAX, path, "Contact email");
  const channelUrl = readCapped(formData, "channel_url", SOURCE_CHANNEL_MAX, path, "Channel or site");
  const notes = readCapped(formData, "source_notes", SOURCE_NOTES_MAX, path, "Source notes");

  if (!name) fail(path, "Name the person or group this training comes from.");
  if (contactEmail && !isSimpleEmail(contactEmail)) {
    fail(path, "Use a valid contact email, or leave it blank.");
  }
  if (channelUrl && !isHttpUrl(channelUrl)) {
    fail(path, "Use a full http or https link for their channel or site.");
  }

  const { data, error } = await supabase
    .from("training_sources")
    .insert({
      name,
      contact_name: contactName || null,
      contact_email: contactEmail ? contactEmail.toLowerCase() : null,
      channel_url: channelUrl || null,
      notes: notes || null,
      created_by: userId,
    })
    .select("id, name")
    .single();

  if (error) fail(path, error.message);
  if (!data) fail(path, "Could not save that source.");
  return data as { id: string; name: string };
}

async function createDraftFromIntake(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    intakeId: string;
    title: string;
    description: string;
    outline: string;
    sourceName: string;
    audience: string;
  }
) {
  const slug = await uniqueSlug(supabase, input.title);
  const notes = [
    `Sourced from ${input.sourceName}.`,
    input.audience ? `Audience: ${input.audience}.` : "",
    "Author Check-in and Action for each session, then Stage the Father path.",
  ]
    .filter(Boolean)
    .join(" ");

  const { data: training, error: trainingError } = await supabase
    .from("trainings")
    .insert({
      title: input.title,
      slug,
      description: input.description || null,
      published: false,
      order_index: 0,
      session_count: 0,
      development_status: "draft",
      working_title: input.sourceName.slice(0, 120),
      development_notes: notes,
      attribution: input.sourceName.slice(0, ATTRIBUTION_MAX),
    })
    .select("id")
    .single();

  if (trainingError) throw trainingError;
  if (!training) throw new Error("Could not open a draft training.");

  const sessions = parseSessionOutline(input.outline);
  if (sessions.length > 0) {
    const rows = [];
    for (const [index, session] of sessions.entries()) {
      const videoId = youtubeVideoId(session.videoUrl);
      const duration = videoId ? await fetchYoutubeDurationSeconds(videoId) : null;
      rows.push({
        training_id: training.id,
        title: session.title,
        keyline: null,
        video_url: session.videoUrl,
        session_number: index + 1,
        order_index: index + 1,
        duration_seconds: duration,
        checkin_prompt: null,
        action_prompt: null,
      });
    }
    const { error: sessionError } = await supabase.from("sessions").insert(rows);
    if (sessionError) throw sessionError;
  }

  const { count } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("training_id", training.id);

  await supabase
    .from("trainings")
    .update({
      session_count: count ?? 0,
      development_status: (count ?? 0) > 0 ? "in_development" : "draft",
    })
    .eq("id", training.id);

  const { error: linkError } = await supabase
    .from("training_intakes")
    .update({
      training_id: training.id,
      status: "drafting",
    })
    .eq("id", input.intakeId);
  if (linkError) throw linkError;

  return training.id as string;
}

export async function bringInTraining(formData: FormData) {
  const path = "/admin/trainings/sources/new";
  const { user } = await requireRole("admin");
  await requireSourcing(path);

  const title = readCapped(formData, "title", INTAKE_TITLE_MAX, path, "Training title");
  const audience = readCapped(formData, "audience", INTAKE_AUDIENCE_MAX, path, "Audience");
  const outline = readCapped(formData, "outline", INTAKE_OUTLINE_MAX, path, "Session outline");
  const description = readCapped(formData, "description", 4000, path, "Description");
  const rightsNotes = readCapped(
    formData,
    "rights_notes",
    INTAKE_RIGHTS_NOTES_MAX,
    path,
    "Rights notes"
  );
  const rightsStatus = String(formData.get("rights_status") ?? "inquiry").trim();
  const requestId = String(formData.get("request_id") ?? "").trim() || null;
  const openDraft = String(formData.get("open_draft") ?? "") === "true";

  if (!title) fail(path, "Name the training you are bringing in.");
  if (!isRightsStatus(rightsStatus)) fail(path, "Choose a rights status.");

  const supabase = await createClient();
  const source = await upsertSource(supabase, formData, path, user.id);

  const { data: intake, error: intakeError } = await supabase
    .from("training_intakes")
    .insert({
      source_id: source.id,
      request_id: requestId,
      title,
      audience: audience || null,
      outline: outline || null,
      rights_status: rightsStatus,
      rights_notes: rightsNotes || null,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (intakeError) fail(path, intakeError.message);
  if (!intake) fail(path, "Could not save this intake.");

  if (!openDraft) {
    revalidateSourcing(`/admin/trainings/intakes/${intake.id}`);
    ok(
      `/admin/trainings/intakes/${intake.id}`,
      "Recorded. Open it as a draft when you are ready to Stage it."
    );
  }

  try {
    const trainingId = await createDraftFromIntake(supabase, {
      intakeId: intake.id,
      title,
      description,
      outline,
      sourceName: source.name,
      audience,
    });
    revalidateSourcing(`/admin/trainings/${trainingId}`);
    ok(
      `/admin/trainings/${trainingId}`,
      "Draft opened in the sandbox. Add Check-in and Action, Stage it, then mark Ready."
    );
  } catch (error) {
    revalidateSourcing(`/admin/trainings/intakes/${intake.id}`);
    fail(
      `/admin/trainings/intakes/${intake.id}`,
      error instanceof Error
        ? error.message
        : "Intake saved, but the draft could not open. Try Open as draft."
    );
  }
}

export async function updateTrainingSource(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "").trim();
  const path = sourceId ? `/admin/trainings/sources/${sourceId}` : "/admin/trainings/sources";
  await requireSourcing(path);
  if (!sourceId) fail("/admin/trainings/sources", "Choose a source.");

  const name = readCapped(formData, "source_name", SOURCE_NAME_MAX, path, "Source name");
  const contactName = readCapped(formData, "contact_name", SOURCE_CONTACT_MAX, path, "Contact name");
  const contactEmail = readCapped(formData, "contact_email", SOURCE_EMAIL_MAX, path, "Contact email");
  const channelUrl = readCapped(formData, "channel_url", SOURCE_CHANNEL_MAX, path, "Channel or site");
  const notes = readCapped(formData, "source_notes", SOURCE_NOTES_MAX, path, "Source notes");

  if (!name) fail(path, "Name is required.");
  if (contactEmail && !isSimpleEmail(contactEmail)) {
    fail(path, "Use a valid contact email, or leave it blank.");
  }
  if (channelUrl && !isHttpUrl(channelUrl)) {
    fail(path, "Use a full http or https link for their channel or site.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_sources")
    .update({
      name,
      contact_name: contactName || null,
      contact_email: contactEmail ? contactEmail.toLowerCase() : null,
      channel_url: channelUrl || null,
      notes: notes || null,
    })
    .eq("id", sourceId);
  if (error) fail(path, error.message);

  revalidateSourcing(path);
  ok(path, "Source saved.");
}

export async function updateTrainingIntake(formData: FormData) {
  const intakeId = String(formData.get("intake_id") ?? "").trim();
  const path = intakeId ? `/admin/trainings/intakes/${intakeId}` : "/admin/trainings/sources";
  await requireSourcing(path);
  if (!intakeId) fail("/admin/trainings/sources", "Choose an intake.");

  const title = readCapped(formData, "title", INTAKE_TITLE_MAX, path, "Training title");
  const audience = readCapped(formData, "audience", INTAKE_AUDIENCE_MAX, path, "Audience");
  const outline = readCapped(formData, "outline", INTAKE_OUTLINE_MAX, path, "Session outline");
  const rightsNotes = readCapped(
    formData,
    "rights_notes",
    INTAKE_RIGHTS_NOTES_MAX,
    path,
    "Rights notes"
  );
  const rightsStatus = String(formData.get("rights_status") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!title) fail(path, "Title is required.");
  if (!isRightsStatus(rightsStatus)) fail(path, "Choose a rights status.");
  if (status && !isIntakeStatus(status)) fail(path, "Choose a status.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("training_intakes")
    .select("id, training_id, status")
    .eq("id", intakeId)
    .maybeSingle();
  if (currentError) fail(path, currentError.message);
  if (!current) fail("/admin/trainings/sources", "That intake was not found.");

  const nextStatus = status || current.status;
  const { error } = await supabase
    .from("training_intakes")
    .update({
      title,
      audience: audience || null,
      outline: outline || null,
      rights_status: rightsStatus,
      rights_notes: rightsNotes || null,
      status: nextStatus,
    })
    .eq("id", intakeId);
  if (error) fail(path, error.message);

  revalidateSourcing(path);
  if (current.training_id) revalidatePath(`/admin/trainings/${current.training_id}`);
  ok(path, "Intake saved.");
}

export async function openIntakeDraft(formData: FormData) {
  const intakeId = String(formData.get("intake_id") ?? "").trim();
  const path = intakeId ? `/admin/trainings/intakes/${intakeId}` : "/admin/trainings/sources";
  await requireSourcing(path);
  if (!intakeId) fail("/admin/trainings/sources", "Choose an intake.");

  const supabase = await createClient();
  const { data: intake, error } = await supabase
    .from("training_intakes")
    .select("id, title, audience, outline, training_id, source_id")
    .eq("id", intakeId)
    .maybeSingle();
  if (error) fail(path, error.message);
  if (!intake) fail("/admin/trainings/sources", "That intake was not found.");
  if (intake.training_id) {
    ok(`/admin/trainings/${intake.training_id}`, "This intake already has a sandbox draft.");
  }

  const { data: source } = await supabase
    .from("training_sources")
    .select("name")
    .eq("id", intake.source_id)
    .maybeSingle();

  try {
    const trainingId = await createDraftFromIntake(supabase, {
      intakeId,
      title: intake.title,
      description: "",
      outline: intake.outline ?? "",
      sourceName: source?.name ?? "Source",
      audience: intake.audience ?? "",
    });
    revalidateSourcing(`/admin/trainings/${trainingId}`);
    ok(
      `/admin/trainings/${trainingId}`,
      "Draft opened in the sandbox. Add Check-in and Action, Stage it, then mark Ready."
    );
  } catch (openError) {
    fail(
      path,
      openError instanceof Error ? openError.message : "Could not open a draft from this intake."
    );
  }
}

export async function addIntakeToSource(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "").trim();
  const path = sourceId ? `/admin/trainings/sources/${sourceId}` : "/admin/trainings/sources";
  const { user } = await requireRole("admin");
  await requireSourcing(path);
  if (!sourceId) fail("/admin/trainings/sources", "Choose a source.");

  const title = readCapped(formData, "title", INTAKE_TITLE_MAX, path, "Training title");
  const audience = readCapped(formData, "audience", INTAKE_AUDIENCE_MAX, path, "Audience");
  const outline = readCapped(formData, "outline", INTAKE_OUTLINE_MAX, path, "Session outline");
  const rightsNotes = readCapped(
    formData,
    "rights_notes",
    INTAKE_RIGHTS_NOTES_MAX,
    path,
    "Rights notes"
  );
  const rightsStatus = String(formData.get("rights_status") ?? "inquiry").trim();
  const openDraft = String(formData.get("open_draft") ?? "") === "true";

  if (!title) fail(path, "Name the training you are bringing in.");
  if (!isRightsStatus(rightsStatus)) fail(path, "Choose a rights status.");

  const supabase = await createClient();
  const { data: source, error: sourceError } = await supabase
    .from("training_sources")
    .select("id, name")
    .eq("id", sourceId)
    .maybeSingle();
  if (sourceError) fail(path, sourceError.message);
  if (!source) fail("/admin/trainings/sources", "That source was not found.");

  const { data: intake, error: intakeError } = await supabase
    .from("training_intakes")
    .insert({
      source_id: sourceId,
      title,
      audience: audience || null,
      outline: outline || null,
      rights_status: rightsStatus,
      rights_notes: rightsNotes || null,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (intakeError) fail(path, intakeError.message);
  if (!intake) fail(path, "Could not save this intake.");

  if (!openDraft) {
    revalidateSourcing(`/admin/trainings/intakes/${intake.id}`);
    ok(`/admin/trainings/intakes/${intake.id}`, "Recorded. Open it as a draft when you are ready.");
  }

  try {
    const trainingId = await createDraftFromIntake(supabase, {
      intakeId: intake.id,
      title,
      description: "",
      outline,
      sourceName: source.name,
      audience,
    });
    revalidateSourcing(`/admin/trainings/${trainingId}`);
    ok(
      `/admin/trainings/${trainingId}`,
      "Draft opened in the sandbox. Add Check-in and Action, Stage it, then mark Ready."
    );
  } catch (error) {
    revalidateSourcing(`/admin/trainings/intakes/${intake.id}`);
    fail(
      `/admin/trainings/intakes/${intake.id}`,
      error instanceof Error ? error.message : "Intake saved, but the draft could not open."
    );
  }
}
