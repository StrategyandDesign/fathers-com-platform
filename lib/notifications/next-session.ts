import {
  continueHref,
  isSessionComplete,
  type Session,
  type SessionProgress,
  type Training,
} from "@/lib/father/types";
import { sessionFilmHref, trainingsHref } from "@/lib/notifications/links";

function sortSessions(a: Session, b: Session) {
  return a.session_number - b.session_number || a.order_index - b.order_index;
}

export type AssignedTraining = {
  training: Training;
  assignedAt: number;
};

export function nextAssignedSession(input: {
  assigned: AssignedTraining[];
  allTrainings: Training[];
  sessions: Session[];
  progress: SessionProgress[];
}) {
  const progressBySession = new Map(input.progress.map((row) => [row.session_id, row]));
  const ordered = [...input.assigned].sort((left, right) => {
    if (left.assignedAt !== right.assignedAt) return left.assignedAt - right.assignedAt;
    return left.training.order_index - right.training.order_index;
  });

  for (const { training } of ordered) {
    const catalog = input.sessions
      .filter((session) => session.training_id === training.id)
      .sort(sortSessions);
    const next = catalog.find((session) => !isSessionComplete(progressBySession.get(session.id) ?? null));
    if (!next) continue;
    const prior = catalog.slice(0, catalog.indexOf(next));
    if (prior.some((session) => !isSessionComplete(progressBySession.get(session.id) ?? null))) {
      continue;
    }
    return {
      session: next,
      training,
      progress: progressBySession.get(next.id) ?? null,
    };
  }
  return null;
}

export function weeklySessionTarget(input: {
  assigned: AssignedTraining[];
  allTrainings: Training[];
  sessions: Session[];
  progress: SessionProgress[];
}) {
  const next = nextAssignedSession(input);
  if (!next) return null;
  if (next.progress?.film_completed) return null;
  return next;
}

export function encouragementHref(input: {
  assigned: AssignedTraining[];
  allTrainings: Training[];
  sessions: Session[];
  progress: SessionProgress[];
}) {
  const next = nextAssignedSession(input);
  if (!next) return trainingsHref();
  return continueHref(next.session.id, next.progress);
}

export function assignmentHref(sessionId: string | null | undefined) {
  return sessionId ? sessionFilmHref(sessionId) : trainingsHref();
}
