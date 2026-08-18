import "server-only";

import type { Session, SessionProgress, Training } from "@/lib/father/types";
import { actionSummaryFromCatalog } from "@/lib/notifications/copy";
import { dispatchDueReminders } from "@/lib/notifications/dispatch";
import { cancelOutbox, enqueueNotification } from "@/lib/notifications/enqueue";
import { certificatesHref, sessionActionHref, sessionFilmHref, trainingsHref } from "@/lib/notifications/links";
import { nextAssignedSession } from "@/lib/notifications/next-session";
import {
  actionDedupeKey,
  assignmentDedupeKey,
  certificateDedupeKey,
  encouragementDedupeKey,
} from "@/lib/notifications/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { filmRuntimeMinutes } from "@/lib/trainings/runtime";

export async function flushDueReminders() {
  if (!createAdminClient()) return;
  try {
    await dispatchDueReminders();
  } catch (error) {
    console.error("[notifications] flush failed", error);
  }
}

export async function queueNewAssignment(input: {
  fatherId: string;
  trainingId: string;
  trainingTitle: string;
  sessionCount: number;
  leaderName: string;
  firstSessionId?: string | null;
}) {
  const supabase = await createClient();
  const href = await assignmentDeepLink(supabase, input.fatherId, input.firstSessionId);
  await enqueueNotification(supabase, {
    userId: input.fatherId,
    type: "new_assignment",
    dedupeKey: assignmentDedupeKey(input.fatherId, input.trainingId),
    href,
    payload: {
      trainingTitle: input.trainingTitle,
      sessionCount: input.sessionCount,
      leaderName: input.leaderName,
      trainingId: input.trainingId,
      sessionId: input.firstSessionId ?? undefined,
    },
  });
  await flushDueReminders();
}

export async function queueCertificateIssued(input: {
  fatherId: string;
  certificateId: string;
  trainingTitle: string;
}) {
  const supabase = await createClient();
  await enqueueNotification(supabase, {
    userId: input.fatherId,
    type: "certificate",
    dedupeKey: certificateDedupeKey(input.fatherId, input.certificateId),
    href: certificatesHref(),
    payload: {
      trainingTitle: input.trainingTitle,
      certificateId: input.certificateId,
    },
  });
  await flushDueReminders();
}

export async function queueActionReminder(input: {
  fatherId: string;
  session: Session;
  trainingTitle: string;
  availableAt: Date;
}) {
  const supabase = await createClient();
  await enqueueNotification(supabase, {
    userId: input.fatherId,
    type: "action",
    dedupeKey: actionDedupeKey(input.fatherId, input.session.id),
    href: sessionActionHref(input.session.id),
    payload: {
      trainingTitle: input.trainingTitle,
      actionSummary: actionSummaryFromCatalog({
        keyline: input.session.keyline,
        title: input.session.title,
      }),
      minutes: filmRuntimeMinutes(input.session.duration_seconds),
      sessionId: input.session.id,
    },
    availableAt: input.availableAt,
    reschedule: true,
  });
}

export async function cancelActionReminder(fatherId: string, sessionId: string) {
  const supabase = await createClient();
  await cancelOutbox(supabase, actionDedupeKey(fatherId, sessionId));
}

async function assignmentDeepLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fatherId: string,
  fallbackSessionId?: string | null
) {
  const [assignmentRes, trainingsRes, sessionsRes, progressRes] = await Promise.all([
    supabase.from("training_assignments").select("training_id, assigned_at").eq("father_id", fatherId),
    supabase.from("trainings").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("session_progress").select("*").eq("father_id", fatherId),
  ]);
  const trainings = (trainingsRes.data ?? []) as Training[];
  const assigned = ((assignmentRes.data ?? []) as Array<{ training_id: string; assigned_at: string | null }>)
    .map((row) => {
      const training = trainings.find((item) => item.id === row.training_id);
      if (!training) return null;
      return { training, assignedAt: Date.parse(row.assigned_at ?? "") || 0 };
    })
    .filter((row): row is { training: Training; assignedAt: number } => Boolean(row));
  const next = nextAssignedSession({
    assigned,
    allTrainings: trainings,
    sessions: (sessionsRes.data ?? []) as Session[],
    progress: (progressRes.data ?? []) as SessionProgress[],
  });
  if (next) return sessionFilmHref(next.session.id);
  return fallbackSessionId ? sessionFilmHref(fallbackSessionId) : trainingsHref();
}

export async function queueLeaderEncouragement(input: {
  fatherId: string;
  nudgeId: string;
  href: string;
}) {
  const supabase = await createClient();
  await enqueueNotification(supabase, {
    userId: input.fatherId,
    type: "leader_encouragement",
    dedupeKey: encouragementDedupeKey(input.fatherId, input.nudgeId),
    href: input.href,
    payload: {},
  });
  await flushDueReminders();
}
