"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { seedGroupAssessmentReviews } from "@/lib/admin/assessment-release";
import { seedGroupTrainingReviews } from "@/lib/admin/release";
import { requireRole } from "@/lib/auth/session";
import { parseParticipationMode } from "@/lib/participation";
import {
  assignTrainingToFather,
  issueCertificateToFather,
  markSessionsCompleteForFather,
} from "@/lib/manager/mutations";
import { redirectManagerAssign } from "@/lib/manager/return-path";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateManager(fatherId?: string, trainingId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/participants");
  revalidatePath("/father");
  revalidatePath("/father/certificates");
  revalidatePath("/father/account");
  revalidatePath("/father/trainings");
  if (fatherId) {
    revalidatePath(`/manager/participants/${fatherId}`);
  }
  if (fatherId && trainingId) {
    revalidatePath(`/manager/participants/${fatherId}/certificates/${trainingId}`);
  }
}

export async function createGroup(formData: FormData) {
  const { user } = await requireRole("manager");
  const name = String(formData.get("name") ?? "").trim() || "Pilot Group";
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      manager_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    fail("/manager", "The group didn’t save. Try again.");
  }
  if (data?.id) {
    await seedGroupTrainingReviews(supabase, data.id);
    await seedGroupAssessmentReviews(supabase, data.id);
  }

  revalidateManager();
  ok("/manager", "Group created. Share the invite code with fathers.");
}

export async function saveParticipationMode(formData: FormData) {
  const { user } = await requireRole("manager");
  const groupId = String(formData.get("group_id") ?? "").trim();
  const mode = parseParticipationMode(formData.get("participation_mode"));

  if (!groupId) {
    fail("/manager", "Choose a group.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ participation_mode: mode })
    .eq("id", groupId)
    .eq("manager_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    fail("/manager", "The setting didn’t save. Try again.");
  }
  if (!data) {
    fail("/manager", "That group is not yours.");
  }

  revalidateManager();
  revalidatePath("/father");
  ok("/manager", "Participation setting saved.");
}

export async function assignTraining(formData: FormData) {
  const { user } = await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "");
  const trainingId = String(formData.get("training_id") ?? "");

  if (!fatherId || !trainingId) {
    redirectManagerAssign("error", "Choose a training to assign.", formData, fatherId);
  }

  const supabase = await createClient();
  const result = await assignTrainingToFather(supabase, user, fatherId, trainingId);

  if (result.status === "failed") {
    redirectManagerAssign(
      "error",
      `${result.reason ?? "The assignment didn’t save."} Try again.`,
      formData,
      fatherId
    );
  }
  if (result.status === "skipped") {
    redirectManagerAssign("error", "That training is already assigned.", formData, fatherId);
  }

  revalidateManager(fatherId);
  redirectManagerAssign("notice", "Training assigned.", formData, fatherId);
}

export async function markTrainingComplete(formData: FormData) {
  await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "");
  const trainingId = String(formData.get("training_id") ?? "");
  const path = `/manager/participants/${fatherId}`;

  if (!fatherId || !trainingId) {
    fail(path || "/manager/participants", "Choose a training to mark complete.");
  }

  const supabase = await createClient();
  const result = await markSessionsCompleteForFather(supabase, fatherId, trainingId);

  if (result.status === "failed") {
    fail(path, `${result.reason ?? "Progress didn’t save."} Try again.`);
  }
  if (result.status === "skipped") {
    ok(path, result.reason ?? "That training is already complete.");
  }

  revalidateManager(fatherId);
  ok(path, "Training marked complete.");
}

export async function previewCertificate(formData: FormData) {
  await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "");
  const trainingId = String(formData.get("training_id") ?? "");

  if (!fatherId || !trainingId) {
    fail("/manager/participants", "Choose a training for the certificate.");
  }

  redirect(`/manager/participants/${fatherId}/certificates/${trainingId}`);
}

export async function sendCertificate(formData: FormData) {
  const { user } = await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "");
  const trainingId = String(formData.get("training_id") ?? "");
  const participantPath = `/manager/participants/${fatherId}`;
  const previewPath =
    fatherId && trainingId
      ? `/manager/participants/${fatherId}/certificates/${trainingId}`
      : participantPath;

  if (!fatherId || !trainingId) {
    fail(participantPath || "/manager/participants", "Choose a training for the certificate.");
  }

  const supabase = await createClient();
  const { data: managed, error: managedError } = await supabase.rpc("manages_father", {
    father_id: fatherId,
  });

  if (managedError) {
    fail(previewPath, "Couldn’t verify this participant. Try again.");
  }
  if (!managed) {
    fail(participantPath, "That participant is not in your group.");
  }

  const result = await issueCertificateToFather(supabase, user, fatherId, trainingId);

  if (result.status === "failed") {
    fail(previewPath, `${result.reason ?? "The certificate didn’t save."} Try again.`);
  }
  if (result.status === "skipped") {
    ok(previewPath, result.reason ?? "A certificate is already on file for this training.");
  }

  revalidateManager(fatherId, trainingId);
  ok(previewPath, `Certificate issued: ${result.serial}`);
}
