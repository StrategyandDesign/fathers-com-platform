"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { createTranslator } from "@/lib/i18n/translate";
import { resolveManagerExportLocale } from "@/lib/i18n/org-locale";
import {
  confirmToken,
  formatBulkNotice,
  isBulkAction,
  parseFatherIds,
} from "@/lib/manager/bulk";
import { loadManagerWorkspace } from "@/lib/manager/data";
import {
  assignTrainingToFather,
  issueCertificateToFather,
  markSessionsCompleteForFather,
} from "@/lib/manager/mutations";
import { recordOrganizationActivity } from "@/lib/org-staff/activity";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

function fail(message: string, extra?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message, ...extra });
  redirect(`/manager/participants?${params.toString()}`);
}

function reviewFail(message: string, formData: FormData): never {
  const params = new URLSearchParams({ error: message });
  const action = String(formData.get("action") ?? "");
  const trainingId = String(formData.get("training_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  if (action) params.set("action", action);
  if (trainingId) params.set("training_id", trainingId);
  if (sessionId) params.set("session_id", sessionId);
  for (const id of parseFatherIds(formData.getAll("father_id").map(String))) {
    params.append("father_id", id);
  }
  redirect(`/manager/participants/bulk?${params.toString()}`);
}

export async function runBulkAction(formData: FormData) {
  const { user } = await requireRole("manager");
  const actionRaw = String(formData.get("action") ?? "");
  const trainingId = String(formData.get("training_id") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "").trim() || null;
  const confirm = String(formData.get("confirm") ?? "").trim();
  const fatherIds = parseFatherIds(formData.getAll("father_id").map(String));

  if (!isBulkAction(actionRaw)) {
    fail("Choose a bulk action.");
  }
  if (!trainingId) {
    fail("Choose a training.");
  }
  if (fatherIds.length === 0) {
    fail("Select at least one participant.");
  }

  const expected = confirmToken(actionRaw);
  if (expected && confirm !== expected) {
    reviewFail(`Type ${expected} to confirm.`, formData);
  }

  if (!(await allowActionRateLimit("manager.bulk"))) {
    reviewFail("Too many bulk actions just now. Try again in a few minutes.", formData);
  }

  const locale = await resolveManagerExportLocale(user.id);
  const t = createTranslator(locale);
  const workspace = await loadManagerWorkspace(user.id);
  const training = workspace.trainings.find((row) => row.id === trainingId);
  if (!training) {
    fail("That training is not in the catalog.");
  }

  const session = sessionId
    ? workspace.sessions.find((row) => row.id === sessionId && row.training_id === trainingId) ?? null
    : null;
  if (sessionId && !session) {
    fail("That session is not in the selected training.");
  }
  if (actionRaw !== "complete" && sessionId) {
    fail("A session can only be chosen when marking complete.");
  }

  const known = new Map(workspace.participants.map((row) => [row.fatherId, row]));
  const supabase = await createClient();
  const ok: string[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const failed: Array<{ name: string; reason: string }> = [];

  for (const fatherId of fatherIds) {
    const participant = known.get(fatherId);
    if (!participant) {
      skipped.push({ name: "Unknown participant", reason: "Not in your group." });
      continue;
    }

    const { data: managed, error: managedError } = await supabase.rpc("manages_father", {
      father_id: fatherId,
    });
    if (managedError || !managed) {
      skipped.push({ name: participant.name, reason: "Not in your group." });
      continue;
    }

    const result =
      actionRaw === "assign"
        ? await assignTrainingToFather(supabase, user, fatherId, trainingId)
        : actionRaw === "complete"
          ? await markSessionsCompleteForFather(supabase, fatherId, trainingId, sessionId)
          : await issueCertificateToFather(supabase, user, fatherId, trainingId, {
              requireComplete: true,
            });

    if (result.status === "ok") {
      ok.push(participant.name);
      const kind =
        actionRaw === "assign"
          ? "training_assigned"
          : actionRaw === "certificates"
            ? "certificate_issued"
            : null;
      if (kind && participant.groupId) {
        await recordOrganizationActivity(supabase, {
          groupId: participant.groupId,
          actorId: user.id,
          kind,
        });
      }
    }
    else if (result.status === "skipped") {
      skipped.push({ name: participant.name, reason: result.reason ?? "Skipped." });
    } else {
      failed.push({ name: participant.name, reason: result.reason ?? "Failed." });
    }
  }

  revalidatePath("/manager");
  revalidatePath("/manager/participants");
  revalidatePath("/father");
  revalidatePath("/father/certificates");
  revalidatePath("/father/account");
  revalidatePath("/father/trainings");
  for (const fatherId of fatherIds) {
    revalidatePath(`/manager/participants/${fatherId}`);
  }

  const notice = formatBulkNotice({
    action: actionRaw,
    trainingTitle: training.title,
    sessionTitle: session?.title ?? null,
    ok,
    skipped,
    failed,
    locale,
  });

  const params = new URLSearchParams({ notice });
  if (failed.length > 0) {
    params.set(
      "error",
      failed.length === 1
        ? t("manager.bulk.closerLook")
        : t("manager.bulk.closerLookMany", { n: failed.length })
    );
  }
  redirect(`/manager/participants?${params.toString()}`);
}
