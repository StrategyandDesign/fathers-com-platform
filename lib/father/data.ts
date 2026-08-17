import { createClient } from "@/lib/supabase/server";
import { loadProfileDraft } from "@/lib/father/profile";
import {
  catalogSessionTotal,
  isSessionComplete,
  isTrainingPublished,
  type FatherProfileSummary,
  type Session,
  type SessionProgress,
  type Training,
} from "@/lib/father/types";
import type { Certificate } from "@/lib/manager/types";

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

function sortByDisplay(a: Session, b: Session) {
  return a.order_index - b.order_index || a.session_number - b.session_number;
}

function sortByCatalog(a: Session, b: Session) {
  return a.session_number - b.session_number || a.order_index - b.order_index;
}

function pickNextSession(
  trainingSessions: Session[],
  progressBySession: Map<string, SessionProgress>,
  completed: number
) {
  if (trainingSessions.length === 0) return undefined;

  // Zero completed: always Session 1 / first catalog row, not order_index or later in-progress.
  if (completed === 0) {
    return [...trainingSessions].sort(sortByCatalog)[0];
  }

  return [...trainingSessions]
    .sort(sortByDisplay)
    .find((session) => !isSessionComplete(progressBySession.get(session.id) ?? null));
}

export async function loadFatherHome(fatherId: string) {
  const supabase = await createClient();

  const [trainingsRes, sessionsRes, progressRes, profileRes, draftRes, certificatesRes, assignmentsRes] =
    await Promise.all([
      supabase.from("trainings").select("*").order("order_index"),
      supabase.from("sessions").select("*").order("order_index"),
      supabase.from("session_progress").select("*").eq("father_id", fatherId),
      supabase
        .from("father_profiles")
        .select("id, taken_at, primary_edge, primary_determination, raw_scores, full_results")
        .eq("father_id", fatherId)
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      loadProfileDraft(fatherId),
      supabase.from("certificates").select("*").eq("father_id", fatherId),
      supabase.from("training_assignments").select("training_id").eq("father_id", fatherId),
    ]);

  if (trainingsRes.error) throw trainingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (progressRes.error) throw progressRes.error;
  if (profileRes.error) throw profileRes.error;
  if (certificatesRes.error) throw certificatesRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  const draft = draftRes;
  const certificates = (certificatesRes.data ?? []) as Certificate[];
  const assignedIds = new Set(
    ((assignmentsRes.data ?? []) as Array<{ training_id: string }>).map((row) => row.training_id)
  );

  const allTrainings = (trainingsRes.data ?? []) as Training[];
  const sessions = (sessionsRes.data ?? []) as Session[];
  const progressBySession = new Map(
    ((progressRes.data ?? []) as SessionProgress[]).map((row) => [
      row.session_id,
      asProgress(row),
    ])
  );
  const progressSessionIds = new Set(progressBySession.keys());
  const certificateIds = new Set(certificates.map((row) => row.training_id));

  const trainings = allTrainings.filter((training) => {
    if (isTrainingPublished(training)) return true;
    if (assignedIds.has(training.id) || certificateIds.has(training.id)) return true;
    return sessions.some(
      (session) => session.training_id === training.id && progressSessionIds.has(session.id)
    );
  });

  const trainingCards = trainings.map((training) => {
    const trainingSessions = sessions
      .filter((session) => session.training_id === training.id)
      .sort(sortByDisplay);
    const completed = trainingSessions.filter((session) =>
      isSessionComplete(progressBySession.get(session.id) ?? null)
    ).length;
    const next = pickNextSession(trainingSessions, progressBySession, completed);

    return {
      training,
      sessions: trainingSessions,
      sessionDots: trainingSessions.map((session) => ({
        id: session.id,
        number: session.session_number,
        title: session.title,
        done: isSessionComplete(progressBySession.get(session.id) ?? null),
      })),
      completed,
      total: catalogSessionTotal(training, trainingSessions.length),
      next,
      nextProgress: next ? progressBySession.get(next.id) ?? null : null,
      certificate: certificates.find((row) => row.training_id === training.id) ?? null,
    };
  });

  const activeCard = trainingCards.find((card) => card.next);

  return {
    trainingCards,
    next: activeCard?.next
      ? {
          session: activeCard.next,
          training: activeCard.training,
          progress: progressBySession.get(activeCard.next.id) ?? null,
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
