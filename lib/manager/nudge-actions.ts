"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { notifyManagerNudge } from "@/lib/email/events";
import { loadNudgeHistory } from "@/lib/manager/nudge-data";
import {
  NUDGE_TEMPLATE_COPY,
  cooldownRemaining,
  isNudgeTemplate,
} from "@/lib/manager/nudges";
import { loadManagedParticipant } from "@/lib/manager/data";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

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
    fail("/manager/participants", "Choose a participant to nudge.");
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

  const organizationName = detail.participant.groupName?.trim() || "your";
  const template = NUDGE_TEMPLATE_COPY[templateKey];
  let status: "sent" | "skipped_pref" | "failed";

  try {
    const result = await notifyManagerNudge({
      fatherId,
      organizationName,
      template,
    });
    status = result.status;
  } catch (error) {
    console.error("[nudges] send failed", error);
    status = "failed";
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
        `Reminder sent to ${detail.participant.name}. We couldn’t record it — wait a few days before sending another.`
      );
    }
    fail(path, "The reminder didn’t save. Try again.");
  }

  revalidatePath("/manager/participants");
  revalidatePath(`/manager/participants/${fatherId}`);

  if (status === "skipped_pref") {
    fail(
      path,
      "He turned off session reminders. The note was not emailed."
    );
  }
  if (status === "failed") {
    fail(path, "The reminder didn’t send. Try again in a few minutes.");
  }

  ok(path, `Reminder sent to ${detail.participant.name}.`);
}
