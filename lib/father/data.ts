import { createClient } from "@/lib/supabase/server";
import { loadProfileDraft } from "@/lib/father/profile";
import {
  asSessionProgress,
  catalogSessionTotal,
  isSessionComplete,
  isTrainingVisibleInCatalog,
  type FatherProfileSummary,
  type Session,
  type SessionProgress,
  type Training,
} from "@/lib/father/types";
import { loadAcceptedTrainingIds } from "@/lib/manager/reviews";
import type { Certificate } from "@/lib/manager/types";
import { parseTimeZone } from "@/lib/notifications/schedule";

function asProgress(row: SessionProgress): SessionProgress {
  return asSessionProgress(row);
}

function sortByDisplay(a: Session, b: Session) {
  return a.order_index - b.order_index || a.session_number - b.session_number;
}

function sortByCatalog(a: Session, b: Session) {
  return a.session_number - b.session_number || a.order_index - b.order_index;
}

export function isSessionUnlocked(
  trainingSessions: Session[],
  progressBySession: Map<string, SessionProgress>,
  sessionId: string
) {
  if (isSessionComplete(progressBySession.get(sessionId) ?? null)) {
    return true;
  }

  const catalog = [...trainingSessions].sort(sortByCatalog);
  const index = catalog.findIndex((session) => session.id === sessionId);
  if (index <= 0) return index === 0;

  return catalog
    .slice(0, index)
    .every((session) => isSessionComplete(progressBySession.get(session.id) ?? null));
}

function firstReachableSessionId(
  trainingSessions: Session[],
  progressBySession: Map<string, SessionProgress>
) {
  const catalog = [...trainingSessions].sort(sortByCatalog);
  const incomplete = catalog.find(
    (session) => !isSessionComplete(progressBySession.get(session.id) ?? null)
  );
  return incomplete?.id ?? catalog[0]?.id ?? null;
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

  const [trainingsRes, sessionsRes, progressRes, profileRes, draftRes, certificatesRes, assignmentsRes, accepted, zoneRes] =
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
      supabase
        .from("training_assignments")
        .select("training_id, assigned_at")
        .eq("father_id", fatherId),
      loadAcceptedTrainingIds(),
      supabase
        .from("notification_preferences")
        .select("timezone")
        .eq("user_id", fatherId)
        .maybeSingle(),
    ]);

  if (trainingsRes.error) throw trainingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (progressRes.error) throw progressRes.error;
  if (profileRes.error) throw profileRes.error;
  if (certificatesRes.error) throw certificatesRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  const draft = draftRes;
  const certificates = (certificatesRes.data ?? []) as Certificate[];
  const assignments = (assignmentsRes.data ?? []) as Array<{
    training_id: string;
    assigned_at: string | null;
  }>;
  const assignedIds = new Set(assignments.map((row) => row.training_id));
  const assignedAt = new Map(
    assignments.map((row) => [row.training_id, Date.parse(row.assigned_at ?? "") || 0])
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
    const access = {
      accepted: accepted.ids.has(training.id),
      assigned: assignedIds.has(training.id),
      hasCertificate: certificateIds.has(training.id),
      hasProgress: sessions.some(
        (session) => session.training_id === training.id && progressSessionIds.has(session.id)
      ),
    };
    return isTrainingVisibleInCatalog(training, access);
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
        unlocked: isSessionUnlocked(trainingSessions, progressBySession, session.id),
        note: progressBySession.get(session.id)?.session_note ?? null,
      })),
      completed,
      total: catalogSessionTotal(training, trainingSessions.length),
      next,
      nextProgress: next ? progressBySession.get(next.id) ?? null : null,
      certificate: certificates.find((row) => row.training_id === training.id) ?? null,
      gated: false,
    };
  });

  const pathCards = trainingCards.filter((card) => assignedIds.has(card.training.id));
  const activeCard = [...pathCards]
    .sort((left, right) => {
      const leftAssigned = assignedAt.get(left.training.id) ?? 0;
      const rightAssigned = assignedAt.get(right.training.id) ?? 0;
      if (leftAssigned !== rightAssigned) return rightAssigned - leftAssigned;
      return left.training.order_index - right.training.order_index;
    })
    .find((card) => card.next);

  const completedAts = ((progressRes.data ?? []) as SessionProgress[])
    .filter((row) => isSessionComplete(asProgress(row)) && row.completed_at)
    .map((row) => row.completed_at as string);

  return {
    trainingCards,
    pathCards,
    next: activeCard?.next
      ? {
          session: activeCard.next,
          training: activeCard.training,
          progress: progressBySession.get(activeCard.next.id) ?? null,
        }
      : null,
    profile: (profileRes.data as FatherProfileSummary | null) ?? null,
    draft,
    certificates,
    completedAts,
    timezone: parseTimeZone(zoneRes.data?.timezone) ?? "UTC",
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

  const typedSession = session as Session;
  const typedTraining = training as Training;

  const { data: siblings, error: siblingsError } = await supabase
    .from("sessions")
    .select("*")
    .eq("training_id", typedSession.training_id)
    .order("order_index");

  if (siblingsError) throw siblingsError;

  const trainingSessions = (siblings ?? []) as Session[];
  const siblingIds = trainingSessions.map((row) => row.id);
  const { data: siblingProgress, error: siblingProgressError } =
    siblingIds.length === 0
      ? { data: [] as SessionProgress[], error: null }
      : await supabase
          .from("session_progress")
          .select("*")
          .eq("father_id", fatherId)
          .in("session_id", siblingIds);

  if (siblingProgressError) throw siblingProgressError;

  const progressBySession = new Map(
    ((siblingProgress ?? []) as SessionProgress[]).map((row) => [row.session_id, asProgress(row)])
  );
  const currentProgress = progress
    ? asProgress(progress as SessionProgress)
    : progressBySession.get(sessionId) ?? null;
  if (currentProgress) {
    progressBySession.set(sessionId, currentProgress);
  }

  const unlocked = isSessionUnlocked(trainingSessions, progressBySession, sessionId);

  const [accepted, assignmentRes, certificateRes] = await Promise.all([
    loadAcceptedTrainingIds(),
    supabase
      .from("training_assignments")
      .select("training_id")
      .eq("father_id", fatherId)
      .eq("training_id", typedTraining.id)
      .maybeSingle(),
    supabase
      .from("certificates")
      .select("id")
      .eq("father_id", fatherId)
      .eq("training_id", typedTraining.id)
      .maybeSingle(),
  ]);

  if (assignmentRes.error) throw assignmentRes.error;
  if (certificateRes.error) throw certificateRes.error;

  const access = {
    accepted: accepted.ids.has(typedTraining.id),
    assigned: Boolean(assignmentRes.data),
    hasProgress: trainingSessions.some((session) => progressBySession.has(session.id)),
    hasCertificate: Boolean(certificateRes.data),
  };
  const visible = isTrainingVisibleInCatalog(typedTraining, access);
  if (!visible) {
    return null;
  }

  return {
    session: typedSession,
    training: typedTraining,
    progress: currentProgress,
    trainingSessions,
    completedCount: trainingSessions.filter((row) =>
      isSessionComplete(progressBySession.get(row.id) ?? null)
    ).length,
    sessionTotal: catalogSessionTotal(typedTraining, trainingSessions.length),
    progressBySession,
    unlocked,
    gated: false,
    gateRedirect: null,
    redirectSessionId: unlocked
      ? sessionId
      : firstReachableSessionId(trainingSessions, progressBySession) ?? sessionId,
  };
}
