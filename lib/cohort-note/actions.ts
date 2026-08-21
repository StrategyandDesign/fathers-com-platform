"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  fatherIdsForCohortNoteAudience,
  isCohortNoteAudienceAllowed,
  parseCohortNoteAudience,
} from "@/lib/cohort-note/audience";
import { COHORT_NOTE_MAX, normalizeCohortNote } from "@/lib/cohort-note/types";
import { requireRole } from "@/lib/auth/session";
import { isManagerOfGroup } from "@/lib/org-staff/membership";
import { enqueueNotification } from "@/lib/notifications/enqueue";
import { flushDueReminders } from "@/lib/notifications/events";
import { fatherHomeHref } from "@/lib/notifications/links";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateCohort() {
  revalidatePath("/father");
  revalidatePath("/father/account");
  revalidatePath("/manager");
}

export async function publishCohortNote(formData: FormData) {
  const { user } = await requireRole("manager");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const audienceTrainingId = parseCohortNoteAudience(formData.get("audience_training_id"));
  const body = normalizeCohortNote(String(formData.get("body") ?? ""));
  const path = "/manager";

  if (!groupId) fail(path, "manager.dashboard.noteChooseGroup");
  if (!(await allowActionRateLimit("manager.note"))) {
    fail(path, "flash.tooMany");
  }
  if (!body) fail(path, "manager.dashboard.noteRequired");
  if (body.length > COHORT_NOTE_MAX) {
    fail(path, "manager.dashboard.noteTooLong");
  }

  const supabase = await createClient();
  if (!(await isManagerOfGroup(supabase, user.id, groupId))) {
    fail(path, "manager.dashboard.noteNotYours");
  }

  if (audienceTrainingId) {
    const [{ data: training }, { data: review }] = await Promise.all([
      supabase
        .from("trainings")
        .select("id, published, released_at, first_published_at, first_released_at")
        .eq("id", audienceTrainingId)
        .maybeSingle(),
      supabase
        .from("organization_training_reviews")
        .select("status")
        .eq("group_id", groupId)
        .eq("training_id", audienceTrainingId)
        .maybeSingle(),
    ]);
    if (
      !isCohortNoteAudienceAllowed({
        training,
        reviewStatus: review?.status,
      })
    ) {
      fail(path, "manager.dashboard.noteBadAudience");
    }
  }

  const payload = {
    group_id: groupId,
    author_id: user.id,
    body,
    updated_by: user.id,
    audience_training_id: audienceTrainingId,
  };
  let { error } = await supabase
    .from("organization_cohort_notes")
    .upsert(payload, { onConflict: "group_id,author_id" });
  if (error && /audience_training_id/i.test(`${error.code} ${error.message}`)) {
    const { audience_training_id: _audience, ...legacy } = payload;
    const retry = await supabase
      .from("organization_cohort_notes")
      .upsert(legacy, { onConflict: "group_id,author_id" });
    error = retry.error;
  }
  if (error) {
    console.error("[cohort-note] publish failed", error.code, error.message);
    fail(path, "manager.dashboard.noteSaveFailed");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const { data: members } = await supabase
    .from("group_members")
    .select("father_id")
    .eq("group_id", groupId);
  const memberIds = ((members ?? []) as Array<{ father_id: string }>).map(
    (row) => row.father_id
  );
  const { data: assignments } =
    audienceTrainingId && memberIds.length
      ? await supabase
          .from("training_assignments")
          .select("father_id, training_id")
          .eq("training_id", audienceTrainingId)
          .in("father_id", memberIds)
      : { data: [] as Array<{ father_id: string; training_id: string }> };
  const recipientIds = fatherIdsForCohortNoteAudience({
    audienceTrainingId,
    memberIds,
    assignedPairs: ((assignments ?? []) as Array<{ father_id: string; training_id: string }>).map(
      (row) => ({ fatherId: row.father_id, trainingId: row.training_id })
    ),
  });
  const { data: saved } = await supabase
    .from("organization_cohort_notes")
    .select("id, updated_at")
    .eq("group_id", groupId)
    .eq("author_id", user.id)
    .maybeSingle();

  const stamp = saved?.updated_at ?? new Date().toISOString();
  const leaderName =
    typeof profile?.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : undefined;

  await Promise.allSettled(
    recipientIds.map((fatherId) =>
      enqueueNotification(supabase, {
        userId: fatherId,
        type: "leader_encouragement",
        dedupeKey: `cohort-note:${fatherId}:${saved?.id ?? groupId}:${stamp}`,
        href: fatherHomeHref(),
        payload: {
          leaderName,
          cohortNote: true,
        },
      })
    )
  );
  await flushDueReminders();

  revalidateCohort();
  ok(path, "manager.dashboard.notePosted");
}

export async function clearCohortNote(formData: FormData) {
  const { user } = await requireRole("manager");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const path = "/manager";

  if (!groupId) fail(path, "manager.dashboard.noteChooseGroup");
  if (!(await allowActionRateLimit("manager.note"))) {
    fail(path, "flash.tooMany");
  }

  const supabase = await createClient();
  if (!(await isManagerOfGroup(supabase, user.id, groupId))) {
    fail(path, "manager.dashboard.noteNotYours");
  }

  const { error } = await supabase
    .from("organization_cohort_notes")
    .delete()
    .eq("group_id", groupId)
    .eq("author_id", user.id);
  if (error) {
    console.error("[cohort-note] clear failed", error.code, error.message);
    fail(path, "manager.dashboard.noteClearFailed");
  }

  revalidateCohort();
  ok(path, "manager.dashboard.noteCleared");
}

export async function dismissCohortNote(formData: FormData) {
  const { user } = await requireRole("father");
  const noteId = String(formData.get("note_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const path = "/father";

  if (!noteId && !groupId) fail(path, "father.home.noteDismissFailed");

  const supabase = await createClient();
  if (noteId) {
    const { data: note } = await supabase
      .from("organization_cohort_notes")
      .select("id, group_id")
      .eq("id", noteId)
      .maybeSingle();
    const { error } = await supabase.from("organization_cohort_note_dismissals").upsert(
      {
        note_id: noteId,
        group_id: note?.group_id ?? groupId,
        father_id: user.id,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: "note_id,father_id" }
    );
    if (error) fail(path, "father.home.noteDismissFailed");
  } else {
    const { error } = await supabase.from("organization_cohort_note_dismissals").upsert(
      {
        group_id: groupId,
        father_id: user.id,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: "group_id,father_id" }
    );
    if (error) fail(path, "father.home.noteDismissFailed");
  }

  revalidatePath("/father");
  ok(path, "father.home.noteDismissed");
}
