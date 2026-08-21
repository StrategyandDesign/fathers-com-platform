"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthContext, requireWalkUser } from "@/lib/auth/session";
import { loadSessionContext } from "@/lib/father/data";
import { nextSkillUse, parseSkillUse } from "@/lib/father/skill-use";
import { isSessionComplete } from "@/lib/father/types";
import { writeFilmSeconds } from "@/lib/father/film-position";
import {
  isIntentionOption,
  parseOutcomeNote,
  resolveIntentionAt,
} from "@/lib/father/action-commitment";
import { loadActionCommitment, loadFatherTimeZone } from "@/lib/father/action-commitment-data";
import { advanceOnboardingAfterSession } from "@/lib/father/start-actions";
import { recordSessionCompletionForStreak } from "@/lib/father/streak-admin";
import { cancelActionReminder, queueActionReminder } from "@/lib/notifications/events";
import { parseTimeZone } from "@/lib/notifications/schedule";
import {
  CHECKIN_CHOICE_KEY,
  CHECKIN_NOTE_KEY,
  CHECKIN_NOTE_MAX_LENGTH,
} from "@/lib/father/session-questions";
import { walkPathsFor, type WalkPaths } from "@/lib/practice/paths";
import { createClient } from "@/lib/supabase/server";

async function requireReachableSession(
  fatherId: string,
  sessionId: string,
  paths: WalkPaths
) {
  const context = await loadSessionContext(fatherId, sessionId);
  if (!context) {
    redirect(paths.home);
  }
  if (!context.unlocked) {
    redirect(context.gateRedirect ?? paths.session(context.redirectSessionId));
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
  action_try_at?: string | null;
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
      action_try_at:
        patch.action_try_at !== undefined
          ? patch.action_try_at
          : existing?.action_try_at ?? null,
      film_seconds:
        typeof existing?.film_seconds === "number" && existing.film_seconds >= 0
          ? existing.film_seconds
          : 0,
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
  revalidatePath("/manager");
  revalidatePath("/manager/practice");
  revalidatePath(`/manager/practice/sessions/${sessionId}`);
  revalidatePath(`/manager/practice/sessions/${sessionId}/checkin`);
  revalidatePath(`/manager/practice/sessions/${sessionId}/action`);
}

export async function markFilmWatched(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const sessionId = String(formData.get("session_id") ?? "");

  if (!sessionId) {
    redirect(paths.home);
  }

  const context = await requireReachableSession(user.id, sessionId, paths);
  if (isSessionComplete(context.progress)) {
    redirect(paths.session(sessionId));
  }

  try {
    await saveProgress(user.id, sessionId, { film_completed: true });
  } catch {
    redirect(
      `${paths.session(sessionId)}?error=${encodeURIComponent("Your progress didn’t save. Try again.")}`
    );
  }

  redirect(paths.checkin(sessionId));
}

export async function submitCheckin(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const sessionId = String(formData.get("session_id") ?? "");

  if (!sessionId) {
    redirect(paths.home);
  }

  const context = await requireReachableSession(user.id, sessionId, paths);
  if (context.progress?.checkin_completed) {
    redirect(paths.action(sessionId));
  }

  const choice = String(formData.get(CHECKIN_CHOICE_KEY) ?? "").trim();
  if (!choice) {
    redirect(
      `${paths.checkin(sessionId)}?error=${encodeURIComponent("Choose an answer to continue.")}`
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
      `${paths.checkin(sessionId)}?error=${encodeURIComponent("Your check-in didn’t save. Try again.")}`
    );
  }

  redirect(paths.action(sessionId));
}

function actionPath(sessionId: string, paths: WalkPaths, error?: string) {
  if (!error) return paths.action(sessionId);
  return `${paths.action(sessionId)}?error=${encodeURIComponent(error)}`;
}

export async function commitActionMoment(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) redirect(paths.home);

  const context = await requireReachableSession(user.id, sessionId, paths);
  if (context.progress?.action_completed) {
    redirect(actionPath(sessionId, paths));
  }

  const option = formData.get("intention");
  if (!isIntentionOption(option)) {
    redirect(actionPath(sessionId, paths, "Pick when you will use it."));
  }

  const timezone = parseTimeZone(formData.get("timezone")) ?? (await loadFatherTimeZone(user.id));
  const intentionAt = resolveIntentionAt({
    option,
    timeZone: timezone,
    customDate: String(formData.get("custom_date") ?? ""),
    customTime: String(formData.get("custom_time") ?? ""),
  });
  if (!intentionAt) {
    redirect(actionPath(sessionId, paths, "Pick a time that is still ahead."));
  }

  const existing = await loadActionCommitment(user.id, sessionId);
  const supabase = await createClient();
  const { error } = await supabase.from("action_commitments").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      intention_label: option,
      intention_at: intentionAt.toISOString(),
      committed_at: existing?.committedAt ?? new Date().toISOString(),
      completed_at: existing?.completedAt ?? null,
      closed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" }
  );
  if (error) {
    redirect(actionPath(sessionId, paths, "That moment didn’t save. Try again."));
  }

  if (role === "father") {
    try {
      await queueActionReminder({
        fatherId: user.id,
        session: context.session,
        trainingTitle: context.training.title,
        availableAt: intentionAt,
      });
    } catch (queueError) {
      console.error("[notifications] action reminder enqueue failed", queueError);
    }
  }

  const { error: zoneError } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    timezone,
    updated_at: new Date().toISOString(),
  });
  if (zoneError) {
    console.error("[notifications] timezone save failed", zoneError);
  }

  redirect(actionPath(sessionId, paths));
}

export async function markActionDone(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) redirect(paths.home);

  const context = await requireReachableSession(user.id, sessionId, paths);
  const commitment = await loadActionCommitment(user.id, sessionId);
  if (!commitment && !context.progress?.action_completed) {
    redirect(actionPath(sessionId, paths, "Lock in a moment first."));
  }

  const newlyComplete =
    !context.progress?.action_completed &&
    Boolean(context.progress?.film_completed && context.progress?.checkin_completed);

  if (!context.progress?.action_completed) {
    try {
      await saveProgress(user.id, sessionId, { action_completed: true });
    } catch {
      redirect(actionPath(sessionId, paths, "Your action didn’t save. Try again."));
    }
  }

  if (newlyComplete && role === "father") {
    try {
      await recordSessionCompletionForStreak(user.id);
    } catch (error) {
      console.error("[streak] completion record failed", error);
    }
  }

  if (commitment && (!commitment.completedAt || !commitment.closedAt)) {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("action_commitments")
      .update({
        completed_at: commitment.completedAt ?? now,
        closed_at: commitment.closedAt ?? now,
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("session_id", sessionId);
    if (error) {
      redirect(actionPath(sessionId, paths, "Your action didn’t save. Try again."));
    }
  }

  if (role === "father") {
    try {
      await cancelActionReminder(user.id, sessionId);
    } catch (error) {
      console.error("[notifications] action reminder cancel failed", error);
    }
  }

  revalidatePath("/father");
  revalidatePath(`/father/sessions/${sessionId}`);
  revalidatePath(`/father/sessions/${sessionId}/action`);
  revalidatePath("/manager/practice");
  revalidatePath(`/manager/practice/sessions/${sessionId}`);
  revalidatePath(`/manager/practice/sessions/${sessionId}/action`);

  if (role === "manager") {
    redirect(paths.done(sessionId));
  }

  const startHref = await advanceOnboardingAfterSession(user.id, sessionId);
  redirect(startHref ?? paths.done(sessionId));
}

export async function finishActionSession(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) redirect(paths.home);

  const context = await requireReachableSession(user.id, sessionId, paths);
  if (!context.progress?.action_completed) {
    redirect(actionPath(sessionId, paths));
  }

  const note = parseOutcomeNote(formData.get("outcome_note"));
  const supabase = await createClient();
  await supabase
    .from("action_commitments")
    .update({
      outcome_note: note,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("session_id", sessionId);

  revalidatePath("/father");
  revalidatePath(`/father/sessions/${sessionId}`);
  revalidatePath(`/father/sessions/${sessionId}/action`);
  revalidatePath("/manager/practice");
  revalidatePath(`/manager/practice/sessions/${sessionId}`);
  revalidatePath(`/manager/practice/sessions/${sessionId}/action`);

  if (role === "manager") {
    redirect(paths.done(sessionId));
  }

  const startHref = await advanceOnboardingAfterSession(user.id, sessionId);
  redirect(startHref ?? paths.done(sessionId));
}

export async function reportSkillUse(formData: FormData) {
  const { user, role } = await requireWalkUser();
  const paths = walkPathsFor(role);
  const sessionId = String(formData.get("session_id") ?? "");
  const report = parseSkillUse(formData.get("skill_use"));
  const returnTo = String(formData.get("return_to") ?? "home") === "done" ? "done" : "home";
  const dest = returnTo === "done" ? paths.done(sessionId) : paths.home;

  if (!sessionId || !report) {
    redirect(dest);
  }

  const context = await loadSessionContext(user.id, sessionId);
  if (!context || !isSessionComplete(context.progress)) {
    redirect(dest);
  }

  const next = nextSkillUse(parseSkillUse(context.progress?.skill_use), report);
  const supabase = await createClient();
  const error = await writeSkillUse(supabase, user.id, sessionId, next);

  if (error) {
    redirect(`${dest}${dest.includes("?") ? "&" : "?"}error=${encodeURIComponent("That didn’t save. Try again.")}`);
  }

  revalidatePath("/father");
  revalidatePath(`/father/sessions/${sessionId}/done`);
  revalidatePath("/manager");
  revalidatePath("/manager/participants");
  revalidatePath(`/manager/participants/${user.id}`);
  revalidatePath("/manager/reports");
  revalidatePath("/manager/practice");
  revalidatePath(`${paths.done(sessionId)}`);

  redirect(dest);
}

async function writeSkillUse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fatherId: string,
  sessionId: string,
  next: NonNullable<ReturnType<typeof parseSkillUse>>
) {
  const stamp = new Date().toISOString();
  const first = await supabase
    .from("session_progress")
    .update({
      skill_use: next,
      skill_use_at: stamp,
    })
    .eq("father_id", fatherId)
    .eq("session_id", sessionId);
  if (!first.error) return null;
  if (next !== "dismissed" || !/skill_use/i.test(first.error.message)) {
    return first.error;
  }
  // Older databases only allowed used/later. Still put the card away.
  const retry = await supabase
    .from("session_progress")
    .update({
      skill_use: "later",
      skill_use_at: stamp,
    })
    .eq("father_id", fatherId)
    .eq("session_id", sessionId);
  return retry.error;
}

export async function saveFilmPosition(sessionId: string, seconds: number) {
  const { user, role } = await getAuthContext();
  if (!user || (role !== "father" && role !== "manager")) return { ok: false as const };
  return writeFilmSeconds(user.id, sessionId, seconds);
}
