"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { COHORT_NOTE_MAX, normalizeCohortNote } from "@/lib/cohort-note/types";
import { requireRole } from "@/lib/auth/session";
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
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, manager_id")
    .eq("id", groupId)
    .maybeSingle();
  if (groupError || !group || group.manager_id !== user.id) {
    fail(path, "manager.dashboard.noteNotYours");
  }

  const { error } = await supabase.from("organization_cohort_notes").upsert({
    group_id: groupId,
    body,
    updated_by: user.id,
  });
  if (error) fail(path, "manager.dashboard.noteSaveFailed");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const { data: members } = await supabase
    .from("group_members")
    .select("father_id")
    .eq("group_id", groupId);
  const { data: saved } = await supabase
    .from("organization_cohort_notes")
    .select("updated_at")
    .eq("group_id", groupId)
    .maybeSingle();

  const stamp = saved?.updated_at ?? new Date().toISOString();
  const leaderName =
    typeof profile?.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : undefined;

  await Promise.allSettled(
    ((members ?? []) as Array<{ father_id: string }>).map((member) =>
      enqueueNotification(supabase, {
        userId: member.father_id,
        type: "leader_encouragement",
        dedupeKey: `cohort-note:${member.father_id}:${groupId}:${stamp}`,
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
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, manager_id")
    .eq("id", groupId)
    .maybeSingle();
  if (groupError || !group || group.manager_id !== user.id) {
    fail(path, "manager.dashboard.noteNotYours");
  }

  const { error } = await supabase
    .from("organization_cohort_notes")
    .delete()
    .eq("group_id", groupId);
  if (error) fail(path, "manager.dashboard.noteClearFailed");

  revalidateCohort();
  ok(path, "manager.dashboard.noteCleared");
}

export async function dismissCohortNote(formData: FormData) {
  const { user } = await requireRole("father");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const path = "/father";

  if (!groupId) fail(path, "father.home.noteDismissFailed");

  const supabase = await createClient();
  const { error } = await supabase.from("organization_cohort_note_dismissals").upsert({
    group_id: groupId,
    father_id: user.id,
    dismissed_at: new Date().toISOString(),
  });
  if (error) fail(path, "father.home.noteDismissFailed");

  revalidatePath("/father");
  ok(path, "father.home.noteDismissed");
}
