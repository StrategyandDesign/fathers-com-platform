import { createClient } from "@/lib/supabase/server";

export const NOTE_MAX_LENGTH = 2000;

export type ParticipantNote = {
  body: string;
  updatedAt: string;
};

export async function loadParticipantNote(fatherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manager_participant_notes")
    .select("body, updated_at")
    .eq("father_id", fatherId)
    .maybeSingle();

  if (error) {
    console.error("[notes] load failed", error.message);
    return null;
  }
  if (!data?.body?.trim()) return null;

  return {
    body: data.body,
    updatedAt: data.updated_at,
  } satisfies ParticipantNote;
}
