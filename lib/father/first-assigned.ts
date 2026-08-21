import { trainingContinueHref } from "@/lib/father/training-door";
import { isSessionComplete, type Session, type SessionProgress, type Training } from "@/lib/father/types";
import { createClient } from "@/lib/supabase/server";

function sortByCatalog(a: Session, b: Session) {
  return a.session_number - b.session_number || a.order_index - b.order_index;
}

export type FirstAssignedSession = {
  session: Session;
  training: Training;
  progress: SessionProgress | null;
  href: string;
};

export async function loadFirstAssignedSession(
  fatherId: string
): Promise<FirstAssignedSession | null> {
  const supabase = await createClient();
  const [assignmentRes, trainingsRes, sessionsRes, progressRes] = await Promise.all([
    supabase
      .from("training_assignments")
      .select("training_id, assigned_at")
      .eq("father_id", fatherId),
    supabase.from("trainings").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("session_progress").select("*").eq("father_id", fatherId),
  ]);

  if (assignmentRes.error) throw assignmentRes.error;
  if (trainingsRes.error) throw trainingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (progressRes.error) throw progressRes.error;

  const assignments = (assignmentRes.data ?? []) as Array<{
    training_id: string;
    assigned_at: string | null;
  }>;
  if (assignments.length === 0) return null;

  const assignedAt = new Map(
    assignments.map((row) => [row.training_id, Date.parse(row.assigned_at ?? "") || 0])
  );
  const assignedIds = new Set(assignments.map((row) => row.training_id));
  const trainings = ((trainingsRes.data ?? []) as Training[]).filter((training) =>
    assignedIds.has(training.id)
  );
  const sessions = (sessionsRes.data ?? []) as Session[];
  const progressBySession = new Map(
    ((progressRes.data ?? []) as SessionProgress[]).map((row) => [row.session_id, row])
  );

  const ordered = [...trainings].sort((left, right) => {
    const leftAssigned = assignedAt.get(left.id) ?? 0;
    const rightAssigned = assignedAt.get(right.id) ?? 0;
    if (leftAssigned !== rightAssigned) return leftAssigned - rightAssigned;
    return left.order_index - right.order_index;
  });

  for (const training of ordered) {
    const trainingSessions = sessions
      .filter((session) => session.training_id === training.id)
      .sort(sortByCatalog);
    const first = trainingSessions[0];
    if (!first) continue;
    const progress = progressBySession.get(first.id) ?? null;
    return {
      session: first,
      training,
      progress,
      href: trainingContinueHref({
        training,
        next: first,
        nextProgress: progress,
        completed: isSessionComplete(progress) ? 1 : 0,
      }),
    };
  }

  return null;
}

export async function hasCompletedSession(fatherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_progress")
    .select("film_completed, checkin_completed, action_completed")
    .eq("father_id", fatherId);

  if (error) throw error;
  return ((data ?? []) as SessionProgress[]).some((row) => isSessionComplete(row));
}
