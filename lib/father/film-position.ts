import { loadSessionContext } from "@/lib/father/data";
import { createClient } from "@/lib/supabase/server";

const MAX_RESUME_SECONDS = 4 * 60 * 60;

function asPosition(seconds: number) {
  if (!Number.isFinite(seconds)) return null;
  const value = Math.floor(seconds);
  if (value < 0 || value > MAX_RESUME_SECONDS) return null;
  return value;
}

export async function writeFilmSeconds(
  fatherId: string,
  sessionId: string,
  seconds: number
) {
  const position = asPosition(seconds);
  if (!sessionId || position == null) return { ok: false as const };

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("session_progress")
    .select("id, film_seconds, status")
    .eq("father_id", fatherId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (loadError) return { ok: false as const };

  if (existing) {
    if (existing.film_seconds === position) return { ok: true as const };
    const patch: { film_seconds: number; status?: "in_progress" } = {
      film_seconds: position,
    };
    if (existing.status === "not_started") {
      patch.status = "in_progress";
    }
    const { error } = await supabase
      .from("session_progress")
      .update(patch)
      .eq("id", existing.id)
      .eq("father_id", fatherId);
    return { ok: !error } as const;
  }

  const context = await loadSessionContext(fatherId, sessionId);
  if (!context?.unlocked) return { ok: false as const };

  const { error } = await supabase.from("session_progress").insert({
    father_id: fatherId,
    session_id: sessionId,
    film_seconds: position,
    film_completed: false,
    checkin_completed: false,
    action_completed: false,
    checkin_answers: {},
    status: "in_progress",
  });

  return { ok: !error } as const;
}
