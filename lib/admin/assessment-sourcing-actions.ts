"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ASSESSMENT_DESCRIPTION_MAX,
  ASSESSMENT_OUTLINE_MAX,
  ASSESSMENT_SCORING_MAX,
  INTAKE_AUDIENCE_MAX,
  INTAKE_RIGHTS_NOTES_MAX,
  INTAKE_TITLE_MAX,
  SOURCE_CHANNEL_MAX,
  SOURCE_CONTACT_MAX,
  SOURCE_EMAIL_MAX,
  SOURCE_NAME_MAX,
  SOURCE_NOTES_MAX,
  compileIntakeInstrument,
} from "@/lib/admin/assessment-sourcing";
import { assessmentKeyFromTitle, assessmentSlugFromTitle } from "@/lib/assessments/instrument";
import { isHttpUrl, isIntakeStatus, isRightsStatus, isSimpleEmail } from "@/lib/admin/sourcing";
import { requireRole } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

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

function revalidateAssessmentSourcing(extra?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/assessments");
  revalidatePath("/admin/assessments/sources");
  if (extra) revalidatePath(extra);
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
      .from("assessment_sources")
      .select("id, name")
      .eq("id", existingId)
      .maybeSingle();
    if (error) fail(path, error.message);
    if (!data) fail(path, "That researcher was not found.");
    return data as { id: string; name: string };
  }

  const name = readCapped(formData, "source_name", SOURCE_NAME_MAX, path, "Researcher name");
  const contactName = readCapped(formData, "contact_name", SOURCE_CONTACT_MAX, path, "Contact name");
  const contactEmail = readCapped(formData, "contact_email", SOURCE_EMAIL_MAX, path, "Contact email");
  const channelUrl = readCapped(formData, "channel_url", SOURCE_CHANNEL_MAX, path, "Site");
  const notes = readCapped(formData, "source_notes", SOURCE_NOTES_MAX, path, "Notes");

  if (!name) fail(path, "Name the researcher or group this assessment comes from.");
  if (contactEmail && !isSimpleEmail(contactEmail)) {
    fail(path, "Use a valid contact email, or leave it blank.");
  }
  if (channelUrl && !isHttpUrl(channelUrl)) {
    fail(path, "Use a full http or https link for their site.");
  }

  const { data, error } = await supabase
    .from("assessment_sources")
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
  if (!data) fail(path, "Could not save that researcher.");
  return data as { id: string; name: string };
}

async function uniqueCatalogIdentity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string
) {
  const baseKey = assessmentKeyFromTitle(title);
  const baseSlug = assessmentSlugFromTitle(title);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`;
    const assessmentKey = (attempt === 0 ? baseKey : `${baseKey.slice(0, 58)}${suffix}`).slice(0, 64);
    const slug = (attempt === 0 ? baseSlug : `${baseSlug.slice(0, 26)}${suffix}`)
      .slice(0, 32)
      .replace(/-+$/g, "");
    const [{ data: keyRow, error: keyError }, { data: slugRow, error: slugError }] = await Promise.all([
      supabase.from("platform_assessments").select("id").eq("assessment_key", assessmentKey).maybeSingle(),
      supabase.from("platform_assessments").select("id").eq("slug", slug).maybeSingle(),
    ]);
    if (keyError) throw keyError;
    if (slugError) throw slugError;
    if (!keyRow && !slugRow) return { assessmentKey, slug };
  }
  const fallback = crypto.randomUUID().slice(0, 8);
  return {
    assessmentKey: `${baseKey.slice(0, 54)}-${fallback}`.slice(0, 64),
    slug: `scale-${fallback}`.slice(0, 32),
  };
}

export async function bringInAssessment(formData: FormData) {
  const { user } = await requireRole("admin");
  const path = "/admin/assessments/sources/new";
  await requireSourcing(path);

  const title = readCapped(formData, "title", INTAKE_TITLE_MAX, path, "Title");
  const audience = readCapped(formData, "audience", INTAKE_AUDIENCE_MAX, path, "Audience");
  const description = readCapped(formData, "description", ASSESSMENT_DESCRIPTION_MAX, path, "Description");
  const questions = readCapped(formData, "questions", ASSESSMENT_OUTLINE_MAX, path, "Questions");
  const scoring = readCapped(formData, "scoring", ASSESSMENT_SCORING_MAX, path, "Scoring model");
  const rightsStatus = String(formData.get("rights_status") ?? "inquiry");
  const rightsNotes = readCapped(formData, "rights_notes", INTAKE_RIGHTS_NOTES_MAX, path, "Rights notes");
  const openDraft = String(formData.get("open_draft") ?? "") === "true";

  if (!title) fail(path, "Add a title.");
  if (!isRightsStatus(rightsStatus)) fail(path, "Choose a rights status.");
  if (questions) {
    const compiled = compileIntakeInstrument(questions, scoring);
    if (!compiled.ok) fail(path, compiled.error);
  }

  const supabase = await createClient();
  const source = await upsertSource(supabase, formData, path, user.id);
  const { data: intake, error } = await supabase
    .from("assessment_intakes")
    .insert({
      source_id: source.id,
      title,
      audience: audience || null,
      description: description || null,
      questions: questions || null,
      scoring: scoring || null,
      rights_status: rightsStatus,
      rights_notes: rightsNotes || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) fail(path, error.message);
  if (!intake) fail(path, "Could not save this intake.");

  if (openDraft && questions) {
    try {
      await openDraftFromIntake(supabase, intake.id, user.id);
    } catch (openError) {
      revalidateAssessmentSourcing(`/admin/assessments/intakes/${intake.id}`);
      fail(
        `/admin/assessments/intakes/${intake.id}`,
        openError instanceof Error ? openError.message : "Recorded. The sandbox draft did not open."
      );
    }
  }

  revalidateAssessmentSourcing(`/admin/assessments/intakes/${intake.id}`);
  ok(`/admin/assessments/intakes/${intake.id}`, "Recorded. Review the scoring model, then open a draft.");
}

async function openDraftFromIntake(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intakeId: string,
  userId: string
) {
  const { data: intake, error } = await supabase
    .from("assessment_intakes")
    .select("*")
    .eq("id", intakeId)
    .maybeSingle();
  if (error) throw error;
  if (!intake) throw new Error("That intake was not found.");
  if (intake.platform_assessment_id) return String(intake.platform_assessment_id);

  const compiled = compileIntakeInstrument(String(intake.questions ?? ""), String(intake.scoring ?? ""));
  if (!compiled.ok) throw new Error(compiled.error);

  const { data: source } = await supabase
    .from("assessment_sources")
    .select("name")
    .eq("id", intake.source_id)
    .maybeSingle();

  const identity = await uniqueCatalogIdentity(supabase, String(intake.title));
  const now = new Date().toISOString();
  const { data: platform, error: platformError } = await supabase
    .from("platform_assessments")
    .insert({
      slug: identity.slug,
      assessment_key: identity.assessmentKey,
      title: String(intake.title).slice(0, 200),
      description: intake.description,
      attribution: source?.name ? String(source.name).slice(0, 120) : null,
      instrument: compiled.value,
      development_status: "draft",
      scoring_method: "weighted_mean",
      scale_min: 1,
      scale_max: 5,
      published: false,
      last_edited_at: now,
      last_edited_by: userId,
      created_by: userId,
      intake_id: intakeId,
      archived: false,
    })
    .select("id")
    .single();
  if (platformError) throw platformError;
  if (!platform) throw new Error("Could not open a sandbox draft.");

  const { error: linkError } = await supabase
    .from("assessment_intakes")
    .update({ platform_assessment_id: platform.id, status: "drafting" })
    .eq("id", intakeId);
  if (linkError) throw linkError;
  return String(platform.id);
}

export async function openAssessmentDraft(formData: FormData) {
  const { user } = await requireRole("admin");
  const intakeId = String(formData.get("intake_id") ?? "").trim();
  const path = intakeId ? `/admin/assessments/intakes/${intakeId}` : "/admin/assessments/sources";
  await requireSourcing(path);
  if (!intakeId) fail("/admin/assessments/sources", "Choose an intake.");

  const supabase = await createClient();
  try {
    await openDraftFromIntake(supabase, intakeId, user.id);
  } catch (error) {
    fail(path, error instanceof Error ? error.message : "Could not open a draft from this intake.");
  }
  revalidateAssessmentSourcing(path);
  ok(path, "Sandbox draft is open. The instrument and scoring key are stored together.");
}

export async function updateAssessmentIntake(formData: FormData) {
  await requireRole("admin");
  const intakeId = String(formData.get("intake_id") ?? "").trim();
  const path = intakeId ? `/admin/assessments/intakes/${intakeId}` : "/admin/assessments/sources";
  await requireSourcing(path);
  if (!intakeId) fail("/admin/assessments/sources", "Choose an intake.");

  const title = readCapped(formData, "title", INTAKE_TITLE_MAX, path, "Title");
  const audience = readCapped(formData, "audience", INTAKE_AUDIENCE_MAX, path, "Audience");
  const description = readCapped(formData, "description", ASSESSMENT_DESCRIPTION_MAX, path, "Description");
  const questions = readCapped(formData, "questions", ASSESSMENT_OUTLINE_MAX, path, "Questions");
  const scoring = readCapped(formData, "scoring", ASSESSMENT_SCORING_MAX, path, "Scoring model");
  const rightsStatus = String(formData.get("rights_status") ?? "inquiry");
  const rightsNotes = readCapped(formData, "rights_notes", INTAKE_RIGHTS_NOTES_MAX, path, "Rights notes");
  const status = String(formData.get("status") ?? "open");

  if (!title) fail(path, "Add a title.");
  if (!isRightsStatus(rightsStatus)) fail(path, "Choose a rights status.");
  if (!isIntakeStatus(status)) fail(path, "Choose an intake status.");
  if (questions) {
    const compiled = compileIntakeInstrument(questions, scoring);
    if (!compiled.ok) fail(path, compiled.error);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_intakes")
    .update({
      title,
      audience: audience || null,
      description: description || null,
      questions: questions || null,
      scoring: scoring || null,
      rights_status: rightsStatus,
      rights_notes: rightsNotes || null,
      status,
    })
    .eq("id", intakeId);
  if (error) fail(path, error.message);

  const compiled = questions ? compileIntakeInstrument(questions, scoring) : null;
  if (compiled?.ok) {
    await supabase
      .from("platform_assessments")
      .update({
        title,
        description: description || null,
        instrument: compiled.value,
        last_edited_at: new Date().toISOString(),
      })
      .eq("intake_id", intakeId);
  }

  revalidateAssessmentSourcing(path);
  ok(path, "Intake saved.");
}

export async function updateAssessmentSource(formData: FormData) {
  await requireRole("admin");
  const sourceId = String(formData.get("source_id") ?? "").trim();
  const path = sourceId ? `/admin/assessments/sources/${sourceId}` : "/admin/assessments/sources";
  await requireSourcing(path);
  if (!sourceId) fail("/admin/assessments/sources", "Choose a researcher.");

  const name = readCapped(formData, "source_name", SOURCE_NAME_MAX, path, "Name");
  const contactName = readCapped(formData, "contact_name", SOURCE_CONTACT_MAX, path, "Contact name");
  const contactEmail = readCapped(formData, "contact_email", SOURCE_EMAIL_MAX, path, "Contact email");
  const channelUrl = readCapped(formData, "channel_url", SOURCE_CHANNEL_MAX, path, "Site");
  const notes = readCapped(formData, "source_notes", SOURCE_NOTES_MAX, path, "Notes");
  if (!name) fail(path, "Name the researcher or group.");
  if (contactEmail && !isSimpleEmail(contactEmail)) {
    fail(path, "Use a valid contact email, or leave it blank.");
  }
  if (channelUrl && !isHttpUrl(channelUrl)) {
    fail(path, "Use a full http or https link for their site.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_sources")
    .update({
      name,
      contact_name: contactName || null,
      contact_email: contactEmail ? contactEmail.toLowerCase() : null,
      channel_url: channelUrl || null,
      notes: notes || null,
    })
    .eq("id", sourceId);
  if (error) fail(path, error.message);
  revalidateAssessmentSourcing(path);
  ok(path, "Researcher saved.");
}

export async function addIntakeToAssessmentSource(formData: FormData) {
  const { user } = await requireRole("admin");
  const sourceId = String(formData.get("source_id") ?? "").trim();
  const path = sourceId ? `/admin/assessments/sources/${sourceId}` : "/admin/assessments/sources";
  await requireSourcing(path);
  if (!sourceId) fail("/admin/assessments/sources", "Choose a researcher.");

  const title = readCapped(formData, "title", INTAKE_TITLE_MAX, path, "Title");
  const audience = readCapped(formData, "audience", INTAKE_AUDIENCE_MAX, path, "Audience");
  const questions = readCapped(formData, "questions", ASSESSMENT_OUTLINE_MAX, path, "Questions");
  const scoring = readCapped(formData, "scoring", ASSESSMENT_SCORING_MAX, path, "Scoring model");
  const rightsStatus = String(formData.get("rights_status") ?? "inquiry");
  if (!title) fail(path, "Add a title.");
  if (!isRightsStatus(rightsStatus)) fail(path, "Choose a rights status.");
  if (questions) {
    const compiled = compileIntakeInstrument(questions, scoring);
    if (!compiled.ok) fail(path, compiled.error);
  }

  const supabase = await createClient();
  const { data: intake, error } = await supabase
    .from("assessment_intakes")
    .insert({
      source_id: sourceId,
      title,
      audience: audience || null,
      questions: questions || null,
      scoring: scoring || null,
      rights_status: rightsStatus,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) fail(path, error.message);
  if (!intake) fail(path, "Could not save this intake.");
  revalidateAssessmentSourcing(`/admin/assessments/intakes/${intake.id}`);
  ok(`/admin/assessments/intakes/${intake.id}`, "Recorded. Open it as a draft when the scoring key is ready.");
}
