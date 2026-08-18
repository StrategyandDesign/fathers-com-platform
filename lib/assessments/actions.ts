"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole, requireWalkUser } from "@/lib/auth/session";
import { walkPathsFor } from "@/lib/practice/paths";
import { customAssessmentKey, isAssessmentAvailable } from "@/lib/assessments/availability";
import {
  loadAssessmentAvailability,
  loadAssignmentTake,
  loadManagerAssessmentDetail,
  loadManagerRoster,
} from "@/lib/assessments/data";
import {
  isQuestionType,
  type CustomAssessmentQuestion,
  type QuestionDraftInput,
} from "@/lib/assessments/types";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateAssessments(assessmentId?: string, fatherId?: string, assignmentId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/assessments");
  revalidatePath("/father");
  revalidatePath("/father/assessments");
  if (assessmentId) {
    revalidatePath(`/manager/assessments/${assessmentId}`);
  }
  if (assessmentId && fatherId) {
    revalidatePath(`/manager/assessments/${assessmentId}/responses/${fatherId}`);
  }
  if (fatherId) {
    revalidatePath(`/manager/participants/${fatherId}`);
  }
  if (assignmentId) {
    revalidatePath(`/father/assessments/${assignmentId}`);
    revalidatePath(`/manager/practice/assessments/${assignmentId}`);
    revalidatePath("/manager/practice");
  }
}

function parseQuestions(formData: FormData): QuestionDraftInput[] | string {
  const raw = String(formData.get("questions") ?? "").trim();
  if (!raw) return "Add at least one question.";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Questions could not be read. Try again.";
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return "Add at least one question.";
  }
  if (parsed.length > 40) {
    return "Keep the assessment to 40 questions or fewer.";
  }

  const questions: QuestionDraftInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return "Each question needs a prompt.";
    }
    const prompt = String("prompt" in item ? item.prompt : "").trim();
    const questionType = "question_type" in item ? item.question_type : null;
    if (!prompt) {
      return "Each question needs a prompt.";
    }
    if (prompt.length > 1000) {
      return "Keep each question under 1,000 characters.";
    }
    if (!isQuestionType(questionType)) {
      return "Choose Short text or Multiple choice for each question.";
    }
    if (questionType === "short_text") {
      questions.push({ prompt, question_type: "short_text", options: null });
      continue;
    }

    const rawOptions = "options" in item ? item.options : null;
    const options = Array.isArray(rawOptions)
      ? rawOptions
          .map((option) => (typeof option === "string" ? option.trim() : ""))
          .filter(Boolean)
      : [];
    const unique = [...new Set(options)];
    if (unique.length < 2) {
      return "Multiple choice questions need at least two options.";
    }
    if (unique.length > 12) {
      return "Keep multiple choice to 12 options or fewer.";
    }
    if (unique.some((option) => option.length > 200)) {
      return "Keep each option under 200 characters.";
    }
    questions.push({ prompt, question_type: "single_select", options: unique });
  }

  return questions;
}

function validateAnswer(question: CustomAssessmentQuestion, value: string) {
  if (!value) return "Answer this question to continue.";
  if (value.length > 2000) return "Keep your answer under 2,000 characters.";
  if (question.question_type === "single_select") {
    if (!question.options?.includes(value)) {
      return "Choose one of the listed options.";
    }
  }
  return null;
}

export async function createAssessment(formData: FormData) {
  const { user } = await requireRole("manager");
  const path = "/manager/assessments/new";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const questions = parseQuestions(formData);

  if (!title) {
    fail(path, "Add a title.");
  }
  if (title.length > 200) {
    fail(path, "Keep the title under 200 characters.");
  }
  if (description && description.length > 2000) {
    fail(path, "Keep the description under 2,000 characters.");
  }
  if (typeof questions === "string") {
    fail(path, questions);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_assessments")
    .insert({
      manager_id: user.id,
      title,
      description,
    })
    .select("id")
    .single();

  if (error || !data) {
    fail(path, "The assessment didn’t save. Try again.");
  }

  const { error: questionError } = await supabase.from("custom_assessment_questions").insert(
    questions.map((question, index) => ({
      assessment_id: data.id,
      order_index: index,
      prompt: question.prompt,
      question_type: question.question_type,
      options: question.options,
    }))
  );

  if (questionError) {
    await supabase.from("custom_assessments").delete().eq("id", data.id);
    fail(path, "The questions didn’t save. Try again.");
  }

  revalidateAssessments(data.id);
  ok(`/manager/assessments/${data.id}`, "Assessment created.");
}

export async function updateAssessment(formData: FormData) {
  const { user } = await requireRole("manager");
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const path = assessmentId ? `/manager/assessments/${assessmentId}` : "/manager/assessments";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!assessmentId) {
    fail("/manager/assessments", "Choose an assessment to update.");
  }
  if (!title) {
    fail(path, "Add a title.");
  }
  if (title.length > 200) {
    fail(path, "Keep the title under 200 characters.");
  }
  if (description && description.length > 2000) {
    fail(path, "Keep the description under 2,000 characters.");
  }

  const detail = await loadManagerAssessmentDetail(user.id, assessmentId);
  if (!detail) {
    fail("/manager/assessments", "That assessment was not found.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_assessments")
    .update({
      title,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assessmentId)
    .eq("manager_id", user.id);

  if (error) {
    fail(path, "The assessment didn’t save. Try again.");
  }

  revalidateAssessments(assessmentId);
  ok(path, "Assessment updated.");
}

export async function assignAssessment(formData: FormData) {
  const { user } = await requireRole("manager");
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const path = assessmentId ? `/manager/assessments/${assessmentId}` : "/manager/assessments";
  const fatherIds = [...new Set(formData.getAll("father_ids").map((value) => String(value).trim()))].filter(
    Boolean
  );

  if (!assessmentId) {
    fail("/manager/assessments", "Choose an assessment to assign.");
  }
  if (fatherIds.length === 0) {
    fail(path, "Select at least one participant.");
  }

  const [detail, roster] = await Promise.all([
    loadManagerAssessmentDetail(user.id, assessmentId),
    loadManagerRoster(user.id),
  ]);
  if (!detail) {
    fail("/manager/assessments", "That assessment was not found.");
  }
  if (detail.questions.length === 0) {
    fail(path, "Add at least one question.");
  }

  const allowed = new Set(roster.map((row) => row.fatherId));
  if (fatherIds.some((fatherId) => !allowed.has(fatherId))) {
    fail(path, "You can only assign fathers in your group.");
  }

  const already = new Set(detail.assignments.map((row) => row.father_id));
  const selected = fatherIds.filter((fatherId) => !already.has(fatherId));
  if (selected.length === 0) {
    fail(path, "Those participants are already assigned.");
  }
  const rosterById = new Map(roster.map((row) => [row.fatherId, row]));
  const groupIds = [...new Set(roster.map((row) => row.groupId).filter(Boolean))];
  const availability = await loadAssessmentAvailability(groupIds);
  const assessmentKey = customAssessmentKey(assessmentId);
  const toInsert = selected.filter((fatherId) => {
    const groupId = rosterById.get(fatherId)?.groupId;
    if (!groupId) return false;
    return isAssessmentAvailable(availability, groupId, assessmentKey);
  });
  if (toInsert.length === 0) {
    fail(path, "flash.assessmentAssignHidden");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("custom_assessment_assignments").insert(
    toInsert.map((fatherId) => ({
      assessment_id: assessmentId,
      father_id: fatherId,
      assigned_by: user.id,
    }))
  );

  if (error) {
    fail(path, "The assignment didn’t save. Try again.");
  }

  revalidateAssessments(assessmentId);
  for (const fatherId of toInsert) {
    revalidatePath(`/manager/participants/${fatherId}`);
  }
  ok(
    path,
    toInsert.length === 1
      ? "Assessment assigned."
      : `Assessment assigned to ${toInsert.length} participants.`
  );
}

export async function assignAssessmentToUnassigned(formData: FormData) {
  const { user } = await requireRole("manager");
  const assessmentId = String(formData.get("assessment_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const path = "/manager/assessments";
  if (!assessmentId) {
    fail(path, "Choose an assessment to assign.");
  }

  const [detail, roster] = await Promise.all([
    loadManagerAssessmentDetail(user.id, assessmentId),
    loadManagerRoster(user.id),
  ]);
  if (!detail) {
    fail(path, "That assessment was not found.");
  }
  if (detail.questions.length === 0) {
    fail(`/manager/assessments/${assessmentId}`, "Add at least one question.");
  }

  const already = new Set(detail.assignments.map((row) => row.father_id));
  const groupIds = [...new Set(roster.map((row) => row.groupId).filter(Boolean))];
  const availability = await loadAssessmentAvailability(groupIds);
  const assessmentKey = customAssessmentKey(assessmentId);
  const remaining = roster.filter((row) => {
    if (already.has(row.fatherId) || !row.groupId) return false;
    if (groupId && row.groupId !== groupId) return false;
    return isAssessmentAvailable(availability, row.groupId, assessmentKey);
  });
  if (remaining.length === 0) {
    fail(path, "flash.alreadyHasTraining");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("custom_assessment_assignments").insert(
    remaining.map((row) => ({
      assessment_id: assessmentId,
      father_id: row.fatherId,
      assigned_by: user.id,
    }))
  );
  if (error) {
    fail(path, "The assignment didn’t save. Try again.");
  }

  revalidateAssessments(assessmentId);
  ok(
    path,
    remaining.length === 1
      ? "Assessment assigned."
      : `Assessment assigned to ${remaining.length} participants.`
  );
}

export async function startLeaderAssessment(formData: FormData) {
  const { user } = await requireRole("manager");
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const home = "/manager/practice";

  if (!assessmentId) {
    redirect(home);
  }

  const supabase = await createClient();
  const { data: assessment, error: assessmentError } = await supabase
    .from("custom_assessments")
    .select("id")
    .eq("id", assessmentId)
    .eq("manager_id", user.id)
    .maybeSingle();

  if (assessmentError || !assessment) {
    fail(home, "That assessment is not available.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("custom_assessment_assignments")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("father_id", user.id)
    .maybeSingle();

  if (existingError) {
    fail(home, "That assessment couldn’t load. Try again.");
  }

  if (existing?.id) {
    redirect(`/manager/practice/assessments/${existing.id}`);
  }

  const { data: created, error } = await supabase
    .from("custom_assessment_assignments")
    .insert({
      assessment_id: assessmentId,
      father_id: user.id,
      assigned_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    fail(home, "The assessment didn’t start. Try again.");
  }

  revalidatePath("/manager/practice");
  redirect(`/manager/practice/assessments/${created.id}`);
}

export async function saveCustomAnswer(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const questionId = String(formData.get("question_id") ?? "");
  const intent = String(formData.get("intent") ?? "next");
  const value = String(formData.get("value") ?? "").trim();
  const home = paths.home;

  if (!assignmentId) {
    redirect(home);
  }

  const path = paths.assessment(assignmentId);
  let ctx;
  try {
    ctx = await loadAssignmentTake(user.id, assignmentId);
  } catch {
    fail(home, "That assessment couldn’t load. Try again from Home.");
  }

  if (!ctx) {
    fail(home, "That assessment is not assigned to you.");
  }
  if (ctx.questions.length === 0) {
    fail(home, "This assessment has no questions yet. Check back after your leader adds some.");
  }
  if (ctx.assignment.status === "completed") {
    redirect(path);
  }

  const index = ctx.questions.findIndex((question) => question.id === questionId);
  const question = index >= 0 ? ctx.questions[index] : null;
  const questionNumber = index >= 0 ? index + 1 : 1;

  if (!question) {
    fail(path, "That question was not found.");
  }

  const needsValue = intent === "next" || intent === "complete";
  if (needsValue) {
    const invalid = validateAnswer(question, value);
    if (invalid) {
      fail(`${path}?q=${questionNumber}`, invalid);
    }
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (value) {
    const invalid = validateAnswer(question, value);
    if (invalid && needsValue) {
      fail(`${path}?q=${questionNumber}`, invalid);
    }
    if (!invalid) {
      const { error } = await supabase.from("custom_assessment_answers").upsert(
        {
          assignment_id: assignmentId,
          question_id: question.id,
          value,
          updated_at: now,
        },
        { onConflict: "assignment_id,question_id" }
      );
      if (error) {
        fail(`${path}?q=${questionNumber}`, "Your answer didn’t save. Try again.");
      }

      if (ctx.assignment.status === "not_started") {
        const { error: statusError } = await supabase
          .from("custom_assessment_assignments")
          .update({
            status: "in_progress",
            started_at: ctx.assignment.started_at ?? now,
          })
          .eq("id", assignmentId)
          .eq("father_id", user.id);
        if (statusError) {
          fail(`${path}?q=${questionNumber}`, "Your answer didn’t save. Try again.");
        }
      }

      ctx.answers.set(question.id, value);
    }
  }

  const isLast = index === ctx.questions.length - 1;
  const shouldComplete = intent === "complete" || (intent === "next" && isLast);

  if (shouldComplete) {
    const missing = ctx.questions.find((item) => !ctx.answers.get(item.id)?.trim());
    if (missing) {
      const missingIndex = ctx.questions.findIndex((item) => item.id === missing.id);
      fail(
        paths.assessment(assignmentId, missingIndex + 1),
        "Answer every question to finish."
      );
    }

    const { error } = await supabase
      .from("custom_assessment_assignments")
      .update({
        status: "completed",
        started_at: ctx.assignment.started_at ?? now,
        completed_at: now,
      })
      .eq("id", assignmentId)
      .eq("father_id", user.id);

    if (error) {
      fail(`${path}?q=${questionNumber}`, "Your answers saved, but the assessment didn’t finish. Try Submit again.");
    }

    revalidateAssessments(ctx.assessment.id, user.id, assignmentId);
    ok(path, "Assessment complete.");
  }

  revalidateAssessments(ctx.assessment.id, user.id, assignmentId);

  if (intent === "exit") {
    redirect(home);
  }
  if (intent === "back") {
    redirect(paths.assessment(assignmentId, Math.max(1, questionNumber - 1)));
  }

  redirect(paths.assessment(assignmentId, Math.min(ctx.questions.length, questionNumber + 1)));
}
