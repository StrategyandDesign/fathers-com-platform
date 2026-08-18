import { createClient } from "@/lib/supabase/server";

export const NOTE_MAX_LENGTH = 2000;

export type ParticipantNote = {
  id: string;
  body: string;
  createdAt: string;
};

export async function loadParticipantNotes(fatherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manager_participant_notes")
    .select("id, body, created_at, updated_at")
    .eq("father_id", fatherId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notes] load failed", error.message);
    return [] as ParticipantNote[];
  }

  return (data ?? [])
    .filter((row) => typeof row.body === "string" && row.body.trim())
    .map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at ?? row.updated_at,
    })) satisfies ParticipantNote[];
}
