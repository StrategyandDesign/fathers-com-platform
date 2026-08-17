"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadSessionContext } from "@/lib/father/data";
import {
  ACTION_ANSWER_KEY,
  CHECKIN_CHOICE_KEY,
  CHECKIN_NOTE_KEY,
  CHECKIN_NOTE_MAX_LENGTH,
} from "@/lib/father/session-questions";
import { createClient } from "@/lib/supabase/server";

async function requireReachableSession(fatherId: string, sessionId: string) {
  const context = await loadSessionContext(fatherId, sessionId);
  if (!context) {
    redirect("/father");
  }
  if (!context.unlocked) {
    redirect(`/father/sessions/${context.redirectSessionId}`);
  }
  return context;
}

type ProgressPatch = {
  film_completed?: boolean;
  checkin_completed?: boolean;
  action_completed?: boolean;
  checkin_answers?: Record<string, string>;
  action_note?: string | null;
  session_note?: string | null;
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
      session_note:
        patch.session_note !== undefined
          ? patch.session_note
          : existing?.session_note ?? null,
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
  revalidatePath("/father/trainings");
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

  await requireReachableSession(user.id, sessionId);

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

  await requireReachableSession(user.id, sessionId);

  const choice = String(formData.get(CHECKIN_CHOICE_KEY) ?? "").trim();
  if (!choice) {
    redirect(
      `/father/sessions/${sessionId}/checkin?error=${encodeURIComponent("Choose an answer to continue.")}`
    );
  }

  const answers: Record<string, string> = { [CHECKIN_CHOICE_KEY]: choice };
  const progressPatch: {
    checkin_completed: true;
    checkin_answers: Record<string, string>;
    session_note?: string | null;
  } = {
    checkin_completed: true,
    checkin_answers: answers,
  };

  if (formData.has(CHECKIN_NOTE_KEY)) {
    const notes = String(formData.get(CHECKIN_NOTE_KEY) ?? "")
      .trim()
      .slice(0, CHECKIN_NOTE_MAX_LENGTH);
    progressPatch.session_note = notes || null;
  }

  try {
    await saveProgress(user.id, sessionId, progressPatch);
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

  const context = await requireReachableSession(user.id, sessionId);
  if (context.progress?.action_completed) {
    redirect("/father");
  }

  const answer = String(formData.get(ACTION_ANSWER_KEY) ?? "").trim();
  const note = String(formData.get("action_note") ?? "").trim();
  if (!answer && !note) {
    redirect(
      `/father/sessions/${sessionId}/action?error=${encodeURIComponent("Choose the teaching point to continue.")}`
    );
  }

  try {
    await saveProgress(user.id, sessionId, {
      action_completed: true,
      action_note: [answer, note].filter(Boolean).join("\n\n") || null,
    });
  } catch {
    redirect(
      `/father/sessions/${sessionId}/action?error=${encodeURIComponent("Your action didn’t save. Try again.")}`
    );
  }

  redirect("/father");
}
