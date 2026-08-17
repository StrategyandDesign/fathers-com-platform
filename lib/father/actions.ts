"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { CHECKIN_QUESTIONS } from "@/lib/father/types";
import { createClient } from "@/lib/supabase/server";

type ProgressPatch = {
  film_completed?: boolean;
  checkin_completed?: boolean;
  action_completed?: boolean;
  checkin_answers?: Record<string, string>;
  action_note?: string | null;
};

async function saveProgress(
  fatherId: string,
  sessionId: string,
  patch: ProgressPatch
) {
  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("session_progress")
    .select("*")
    .eq("father_id", fatherId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  const film = patch.film_completed ?? existing?.film_completed ?? false;
  const checkin = patch.checkin_completed ?? existing?.checkin_completed ?? false;
  const action = patch.action_completed ?? existing?.action_completed ?? false;
  const allDone = Boolean(film && checkin && action);

  const { error } = await supabase.from("session_progress").upsert(
    {
      father_id: fatherId,
      session_id: sessionId,
      film_completed: film,
      checkin_completed: checkin,
      action_completed: action,
      checkin_answers: patch.checkin_answers ?? existing?.checkin_answers ?? {},
      action_note: patch.action_note ?? existing?.action_note ?? null,
      status: allDone ? "completed" : film || checkin || action ? "in_progress" : "not_started",
      completed_at: allDone
        ? (existing?.completed_at ?? new Date().toISOString())
        : null,
    },
    { onConflict: "father_id,session_id" }
  );

  if (error) {
    throw error;
  }

  revalidatePath("/father");
  revalidatePath(`/father/sessions/${sessionId}`);
  revalidatePath(`/father/sessions/${sessionId}/checkin`);
  revalidatePath(`/father/sessions/${sessionId}/action`);
}

export async function markFilmWatched(formData: FormData) {
  const { user } = await requireRole("father");
  const sessionId = String(formData.get("session_id") ?? "");

  if (!sessionId) {
    redirect("/father");
  }

  try {
    await saveProgress(user.id, sessionId, { film_completed: true });
  } catch {
    redirect(
      `/father/sessions/${sessionId}?error=${encodeURIComponent("Your progress didn’t save. Try again.")}`
    );
  }

  redirect(`/father/sessions/${sessionId}/checkin`);
}

export async function submitCheckin(formData: FormData) {
  const { user } = await requireRole("father");
  const sessionId = String(formData.get("session_id") ?? "");

  if (!sessionId) {
    redirect("/father");
  }

  const answers: Record<string, string> = {};
  for (const question of CHECKIN_QUESTIONS) {
    const value = String(formData.get(question.key) ?? "").trim();
    if (!value) {
      redirect(
        `/father/sessions/${sessionId}/checkin?error=${encodeURIComponent("Answer all three questions to continue.")}`
      );
    }
    answers[question.key] = value;
  }

  try {
    await saveProgress(user.id, sessionId, {
      checkin_completed: true,
      checkin_answers: answers,
    });
  } catch {
    redirect(
      `/father/sessions/${sessionId}/checkin?error=${encodeURIComponent("Your check-in didn’t save. Try again.")}`
    );
  }

  redirect(`/father/sessions/${sessionId}/action`);
}

export async function completeAction(formData: FormData) {
  const { user } = await requireRole("father");
  const sessionId = String(formData.get("session_id") ?? "");

  if (!sessionId) {
    redirect("/father");
  }

  const note = String(formData.get("action_note") ?? "").trim();

  try {
    await saveProgress(user.id, sessionId, {
      action_completed: true,
      action_note: note || null,
    });
  } catch {
    redirect(
      `/father/sessions/${sessionId}/action?error=${encodeURIComponent("Your action didn’t save. Try again.")}`
    );
  }

  redirect("/father");
}
