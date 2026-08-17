"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { renderCertificatePdf } from "@/lib/certificates/pdf";
import { formatCertificateDate } from "@/lib/certificates/types";
import { notifyCertificateIssued, notifyTrainingAssigned } from "@/lib/email/events";
import { isTrainingPublished } from "@/lib/father/types";
import { createClient } from "@/lib/supabase/server";
import { CERTIFICATES_BUCKET, certificateObjectPath } from "@/lib/storage";
import { displayName, profileName } from "@/lib/manager/types";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateManager(fatherId?: string, trainingId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/participants");
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

  const { error } = await supabase.from("groups").insert({
    name,
    manager_id: user.id,
  });

  if (error) {
    fail("/manager", error.message);
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
  const { data: catalog, error: catalogError } = await supabase
    .from("trainings")
    .select("published")
    .eq("id", trainingId)
    .maybeSingle();

  if (catalogError) {
    fail(path, catalogError.message);
  }
  if (!catalog || !isTrainingPublished(catalog)) {
    fail(path, "That training is not published.");
  }

  const { error } = await supabase.from("training_assignments").insert({
    father_id: fatherId,
    training_id: trainingId,
    assigned_by: user.id,
  });

  if (error) {
    fail(path, error.message);
  }

  const { data: training } = await supabase
    .from("trainings")
    .select("title")
    .eq("id", trainingId)
    .maybeSingle();

  await notifyTrainingAssigned({
    fatherId,
    trainingTitle: training?.title ?? "A training",
  });

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
  const { data: sessions, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("training_id", trainingId);

  if (sessionError) {
    fail(path, sessionError.message);
  }

  const now = new Date().toISOString();
  const rows = (sessions ?? []).map((session) => ({
    father_id: fatherId,
    session_id: session.id,
    film_completed: true,
    checkin_completed: true,
    action_completed: true,
    status: "completed",
    completed_at: now,
  }));

  if (rows.length === 0) {
    fail(path, "That training has no sessions.");
  }

  const { error } = await supabase
    .from("session_progress")
    .upsert(rows, { onConflict: "father_id,session_id" });

  if (error) {
    fail(path, error.message);
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
    fail(previewPath, managedError.message);
  }
  if (!managed) {
    fail(participantPath, "That participant is not in your group.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("certificates")
    .select("id")
    .eq("father_id", fatherId)
    .eq("training_id", trainingId)
    .maybeSingle();

  if (existingError) {
    fail(previewPath, existingError.message);
  }
  if (existing) {
    ok(previewPath, "A certificate is already on file for this training.");
  }

  const [fatherRes, trainingRes, managerRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", fatherId).maybeSingle(),
    supabase.from("trainings").select("id, title").eq("id", trainingId).maybeSingle(),
    supabase.from("profiles").select("id, full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (fatherRes.error) fail(previewPath, fatherRes.error.message);
  if (trainingRes.error) fail(previewPath, trainingRes.error.message);
  if (managerRes.error) fail(previewPath, managerRes.error.message);
  if (!fatherRes.data || !trainingRes.data) {
    fail(previewPath, "Could not load the father or training for this certificate.");
  }

  const issuedAt = new Date();
  const serial = `FC-${issuedAt.getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const fatherName = displayName(fatherRes.data, fatherId);
  const managerName = profileName(
    managerRes.data,
    user.email?.split("@")[0] ?? "Manager"
  );
  const storagePath = certificateObjectPath(fatherId, serial);

  let pdf: Uint8Array;
  try {
    pdf = await renderCertificatePdf({
      fatherName,
      trainingName: trainingRes.data.title,
      completedOn: formatCertificateDate(issuedAt.toISOString()),
      serialNumber: serial,
      managerName,
    });
  } catch (error) {
    fail(previewPath, error instanceof Error ? error.message : "Could not generate the PDF.");
  }

  const { error: uploadError } = await supabase.storage
    .from(CERTIFICATES_BUCKET)
    .upload(storagePath, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    fail(previewPath, uploadError.message);
  }

  const { error } = await supabase.from("certificates").insert({
    father_id: fatherId,
    training_id: trainingId,
    serial_number: serial,
    issued_by: user.id,
    issued_at: issuedAt.toISOString(),
    pdf_storage_path: storagePath,
  });

  if (error) {
    await supabase.storage.from(CERTIFICATES_BUCKET).remove([storagePath]);
    fail(previewPath, error.message);
  }

  await notifyCertificateIssued({
    fatherId,
    managerId: user.id,
    fatherName,
    trainingTitle: trainingRes.data.title,
    serial,
  });

  revalidateManager(fatherId, trainingId);
  ok(previewPath, `Certificate issued: ${serial}`);
}
