"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadManagedParticipant } from "@/lib/manager/data";
import { NOTE_MAX_LENGTH } from "@/lib/manager/notes";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

async function requireManagedFather(managerId: string, fatherId: string) {
  const detail = await loadManagedParticipant(managerId, fatherId);
  if (!detail) {
    fail("/manager/participants", "That participant is not in your group.");
  }
  return detail;
}

export async function saveParticipantNote(formData: FormData) {
  const { user } = await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const path = `/manager/participants/${fatherId}`;

  if (!fatherId) {
    fail("/manager/participants", "Choose a participant first.");
  }
  if (!(await allowActionRateLimit("manager.note"))) {
    fail(path, "Too many note saves just now. Try again in a minute.");
  }
  if (body.length > NOTE_MAX_LENGTH) {
    fail(path, `Keep the note under ${NOTE_MAX_LENGTH} characters.`);
  }

  await requireManagedFather(user.id, fatherId);
  const supabase = await createClient();

  if (!body) {
    const { error } = await supabase
      .from("manager_participant_notes")
      .delete()
      .eq("father_id", fatherId);
    if (error) fail(path, "The note didn’t clear. Try again.");
    revalidatePath(path);
    ok(path, "Private note cleared.");
  }

  const { error } = await supabase.from("manager_participant_notes").upsert(
    {
      father_id: fatherId,
      body,
      updated_by: user.id,
    },
    { onConflict: "father_id" }
  );

  if (error) fail(path, "The note didn’t save. Try again.");
  revalidatePath(path);
  ok(path, "Private note saved.");
}

export async function clearParticipantNote(formData: FormData) {
  const { user } = await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "").trim();
  const path = `/manager/participants/${fatherId}`;

  if (!fatherId) {
    fail("/manager/participants", "Choose a participant first.");
  }
  if (!(await allowActionRateLimit("manager.note"))) {
    fail(path, "Too many note saves just now. Try again in a minute.");
  }

  await requireManagedFather(user.id, fatherId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("manager_participant_notes")
    .delete()
    .eq("father_id", fatherId);

  if (error) fail(path, "The note didn’t clear. Try again.");
  revalidatePath(path);
  ok(path, "Private note cleared.");
}
