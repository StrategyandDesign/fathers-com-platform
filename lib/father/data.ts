import { createClient } from "@/lib/supabase/server";
import { loadProfileDraft } from "@/lib/father/profile";
import {
  isSessionComplete,
  type FatherProfileSummary,
  type Session,
  type SessionProgress,
  type Training,
} from "@/lib/father/types";

function asProgress(row: SessionProgress): SessionProgress {
  const answers = row.checkin_answers;
  return {
    ...row,
    checkin_answers:
      answers && typeof answers === "object" && !Array.isArray(answers)
        ? (answers as Record<string, string>)
        : {},
  };
}

export async function loadFatherHome(fatherId: string) {
  const supabase = await createClient();

  const [trainingsRes, sessionsRes, progressRes, profileRes, draftRes] = await Promise.all([
    supabase.from("trainings").select("*").order("order_index"),
    supabase.from("sessions").select("*").order("order_index"),
    supabase.from("session_progress").select("*").eq("father_id", fatherId),
    supabase
      .from("father_profiles")
      .select("id, taken_at, primary_edge, primary_determination")
      .eq("father_id", fatherId)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadProfileDraft(fatherId),
  ]);

  if (trainingsRes.error) throw trainingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (progressRes.error) throw progressRes.error;
  if (profileRes.error) throw profileRes.error;
  const draft = draftRes;

  const trainings = (trainingsRes.data ?? []) as Training[];
  const sessions = (sessionsRes.data ?? []) as Session[];
  const progressBySession = new Map(
    ((progressRes.data ?? []) as SessionProgress[]).map((row) => [
      row.session_id,
      asProgress(row),
    ])
  );

  const trainingCards = trainings.map((training) => {
    const trainingSessions = sessions
      .filter((session) => session.training_id === training.id)
      .sort((a, b) => a.order_index - b.order_index);
    const completed = trainingSessions.filter((session) =>
      isSessionComplete(progressBySession.get(session.id) ?? null)
    ).length;
    const next = trainingSessions.find(
      (session) => !isSessionComplete(progressBySession.get(session.id) ?? null)
    );

    return {
      training,
      sessions: trainingSessions,
      completed,
      total: trainingSessions.length,
      next,
    };
  });

  const orderedSessions = trainings.flatMap((training) =>
    sessions
      .filter((session) => session.training_id === training.id)
      .sort((a, b) => a.order_index - b.order_index)
  );
  const nextSession = orderedSessions.find(
    (session) => !isSessionComplete(progressBySession.get(session.id) ?? null)
  );
  const nextTraining = nextSession
    ? trainings.find((training) => training.id === nextSession.training_id)
    : null;

  return {
    trainingCards,
    next: nextSession && nextTraining
      ? {
          session: nextSession,
          training: nextTraining,
          progress: progressBySession.get(nextSession.id) ?? null,
        }
      : null,
    profile: (profileRes.data as FatherProfileSummary | null) ?? null,
    draft,
  };
}

export async function loadSessionContext(fatherId: string, sessionId: string) {
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data: training, error: trainingError } = await supabase
    .from("trainings")
    .select("*")
    .eq("id", (session as Session).training_id)
    .maybeSingle();

  if (trainingError) throw trainingError;
  if (!training) return null;

  const { data: progress, error: progressError } = await supabase
    .from("session_progress")
    .select("*")
    .eq("father_id", fatherId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (progressError) throw progressError;

  return {
    session: session as Session,
    training: training as Training,
    progress: progress ? asProgress(progress as SessionProgress) : null,
  };
}
