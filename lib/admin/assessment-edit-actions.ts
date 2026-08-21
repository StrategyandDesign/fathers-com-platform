"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  firstPartyAdminPath,
  getFirstPartyAssessment,
  isFirstPartyAssessmentKey,
} from "@/lib/assessments/first-party";
import {
  applyFirstPartyEditorIntent,
  compileFirstPartyDraft,
  readFirstPartyEditorForm,
  storedInstrumentPayload,
} from "@/lib/assessments/first-party-catalog";
import { requireRole } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateAssessmentDesk(assessmentKey: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/assessments");
  revalidatePath(firstPartyAdminPath(assessmentKey));
  revalidatePath(`${firstPartyAdminPath(assessmentKey)}/preview`);
  revalidatePath("/manager/assessments");
  revalidatePath(`/manager/assessments/${assessmentKey}`);
  revalidatePath(`/manager/assessment-reviews/${assessmentKey}`);
  revalidatePath("/father/assessments");
  revalidatePath(`/father/assessments/p/${assessmentKey}`);
}

export async function saveFirstPartyAssessment(formData: FormData) {
  const { user } = await requireRole("admin");
  const assessmentKey = String(formData.get("assessment_key") ?? "").trim();
  const path = isFirstPartyAssessmentKey(assessmentKey)
    ? firstPartyAdminPath(assessmentKey)
    : "/admin/assessments";
  if (!isFirstPartyAssessmentKey(assessmentKey)) {
    fail("/admin/assessments", "That assessment was not found.");
  }
  if (!(await allowActionRateLimit("admin.assessment_edit"))) {
    fail(path, "Too many edits just now. Try again in a minute.");
  }

  const seed = getFirstPartyAssessment(assessmentKey);
  if (!seed) fail("/admin/assessments", "That assessment was not found.");

  const draft = applyFirstPartyEditorIntent(readFirstPartyEditorForm(formData), formData, seed);
  const intent = formData.get("remove_question") != null
    ? "remove_question"
    : formData.get("remove_band") != null
      ? "remove_band"
      : String(formData.get("intent") ?? "save").trim();
  const compiled = compileFirstPartyDraft(seed, draft, { requireComplete: intent === "save" });
  if (!compiled.ok) fail(path, compiled.error);
  const assessment = compiled.assessment;

  const supabase = await createClient();
  const now = new Date().toISOString();
  const payload = {
    title: assessment.title,
    description: assessment.description,
    instrument: storedInstrumentPayload(assessment),
    last_edited_at: now,
    last_edited_by: user.id,
    archived: false,
  };

  const { data: existing, error: existingError } = await supabase
    .from("platform_assessments")
    .select("id")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();
  if (existingError) fail(path, existingError.message);

  if (existing?.id) {
    const { error } = await supabase
      .from("platform_assessments")
      .update(payload)
      .eq("assessment_key", assessmentKey);
    if (error) fail(path, error.message);
  } else {
    const { error } = await supabase.from("platform_assessments").insert({
      slug: seed.slug,
      assessment_key: seed.key,
      attribution: "Fathers.com",
      development_status: "ready_for_review",
      scoring_method: "weighted_mean",
      scale_min: 1,
      scale_max: 5,
      published: false,
      created_by: user.id,
      ...payload,
    });
    if (error) fail(path, error.message);
  }

  revalidateAssessmentDesk(assessmentKey);
  if (intent === "save") {
    ok(path, "Assessment saved. Preview it, then release it when it is ready.");
  }
  if (intent === "add_question") {
    ok(path, "Question added. Save when the prompt and choices are complete.");
  }
  if (intent === "remove_question") {
    ok(path, "Question removed.");
  }
  if (intent === "add_band") {
    ok(path, "Designation added. Save when the range and name are complete.");
  }
  ok(path, "Designation removed.");
}
