"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadNudgeHistory, loadReminderPrefAllowed } from "@/lib/manager/nudge-data";
import {
  cooldownRemaining,
  isNudgeTemplate,
} from "@/lib/manager/nudges";
import { loadManagedParticipant } from "@/lib/manager/data";
import { queueLeaderEncouragement } from "@/lib/notifications/events";
import { encouragementHref } from "@/lib/notifications/next-session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Session, SessionProgress, Training } from "@/lib/father/types";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

export async function sendNudge(formData: FormData) {
  const { user } = await requireRole("manager");
  const fatherId = String(formData.get("father_id") ?? "").trim();
  const templateKey = String(formData.get("template") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();
  const path =
    returnTo === "list"
      ? "/manager/participants"
      : returnTo === "dashboard"
        ? "/manager"
        : `/manager/participants/${fatherId}`;

  if (!fatherId) {
    fail("/manager/participants", "Choose a participant to send a note.");
  }
  if (!isNudgeTemplate(templateKey)) {
    fail(path, "Choose a reminder to send.");
  }

  if (!(await allowActionRateLimit("manager.nudge"))) {
    fail(path, "Too many reminders just now. Try again in a few minutes.");
  }

  const detail = await loadManagedParticipant(user.id, fatherId);
  if (!detail) {
    fail("/manager/participants", "That participant is not in your group.");
  }

  const history = await loadNudgeHistory([fatherId]);
  if (history.unavailable) {
    fail(path, "Couldn’t check recent reminders. Try again.");
  }
  const remaining = cooldownRemaining(history.byFather.get(fatherId) ?? []);
  if (remaining > 0) {
    fail(
      path,
      remaining === 1
        ? "A reminder already went out. You can send another tomorrow."
        : `A reminder already went out. You can send another in ${remaining} days.`
    );
  }

  const allowed = await loadReminderPrefAllowed(fatherId);
  let status: "sent" | "skipped_pref" | "failed";

  if (allowed === false) {
    status = "skipped_pref";
  } else {
    try {
      const href = await loadEncouragementHref(fatherId);
      const nudgeId = crypto.randomUUID();
      await queueLeaderEncouragement({ fatherId, nudgeId, href });
      status = "sent";
    } catch (error) {
      console.error("[nudges] send failed", error);
      status = "failed";
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("manager_nudges").insert({
    father_id: fatherId,
    manager_id: user.id,
    template_key: templateKey,
    status,
  });

  if (error) {
    if (status === "sent") {
      ok(
        path,
        `Reminder sent to ${detail.participant.name}. We couldn’t record it. Wait a few days before sending another.`
      );
    }
    fail(path, "The reminder didn’t save. Try again.");
  }

  revalidatePath("/manager/participants");
  revalidatePath(`/manager/participants/${fatherId}`);

  if (status === "skipped_pref") {
    fail(
      path,
      "He turned off notes from his leader. The note was not sent."
    );
  }
  if (status === "failed") {
    fail(path, "The reminder didn’t send. Try again in a few minutes.");
  }

  ok(path, `Reminder sent to ${detail.participant.name}.`);
}

async function loadEncouragementHref(fatherId: string) {
  const supabase = await createClient();
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
  return encouragementHref({
    assigned,
    allTrainings: trainings,
    sessions: (sessionsRes.data ?? []) as Session[],
    progress: (progressRes.data ?? []) as SessionProgress[],
  });
}
