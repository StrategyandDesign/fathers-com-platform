"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string) {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateManager(fatherId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/participants");
  if (fatherId) {
    revalidatePath(`/manager/participants/${fatherId}`);
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
  const { error } = await supabase.from("training_assignments").insert({
    father_id: fatherId,
    training_id: trainingId,
    assigned_by: user.id,
  });

  if (error) {
    fail(path, error.message);
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

export async function sendCertificate(formData: FormData) {
  const { user } = await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "");
  const trainingId = String(formData.get("training_id") ?? "");
  const path = `/manager/participants/${fatherId}`;

  if (!fatherId || !trainingId) {
    fail(path || "/manager/participants", "Choose a training for the certificate.");
  }

  const serial = `FC-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const supabase = await createClient();
  const { error } = await supabase.from("certificates").insert({
    father_id: fatherId,
    training_id: trainingId,
    serial_number: serial,
    issued_by: user.id,
  });

  if (error) {
    fail(path, error.message);
  }

  revalidateManager(fatherId);
  ok(path, `Certificate issued: ${serial}`);
}
