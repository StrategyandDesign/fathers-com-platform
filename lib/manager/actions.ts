"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { seedGroupAssessmentReviews } from "@/lib/admin/assessment-release";
import { seedGroupTrainingReviews } from "@/lib/admin/release";
import { requireRole } from "@/lib/auth/session";
import {
  assignTrainingToFather,
  issueCertificateToFather,
  markSessionsCompleteForFather,
} from "@/lib/manager/mutations";
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

export async function assignTraining(formData: FormData) {
  const { user } = await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "");
  const trainingId = String(formData.get("training_id") ?? "");
  const path = `/manager/participants/${fatherId}`;

  if (!fatherId || !trainingId) {
    fail(path || "/manager/participants", "Choose a training to assign.");
  }

  const supabase = await createClient();
  const result = await assignTrainingToFather(supabase, user, fatherId, trainingId);

  if (result.status === "failed") {
    fail(path, `${result.reason ?? "The assignment didn’t save."} Try again.`);
  }
  if (result.status === "skipped") {
    fail(path, "That training is already assigned.");
  }

  revalidateManager(fatherId);
  ok(path, "Training assigned.");
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
