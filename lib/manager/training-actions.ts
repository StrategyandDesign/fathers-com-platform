"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { canAssignTrainingToGroup } from "@/lib/manager/assignment-status";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { assignTrainingToFather } from "@/lib/manager/mutations";
import { redirectManagerAssign } from "@/lib/manager/return-path";
import { recordOrganizationActivity } from "@/lib/org-staff/activity";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function assignTrainingToUnassigned(formData: FormData) {
  const { user } = await requireRole("manager");
  const trainingId = String(formData.get("training_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();

  if (!UUID.test(trainingId)) {
    redirectManagerAssign("error", "Choose a training.", formData);
  }
  if (groupId && !UUID.test(groupId)) {
    redirectManagerAssign("error", "Choose a training.", formData);
  }
  if (!(await allowActionRateLimit("manager.bulk"))) {
    redirectManagerAssign(
      "error",
      "Too many bulk actions just now. Try again in a few minutes.",
      formData
    );
  }

  const workspace = await loadManagerWorkspace(user.id);
  const training = workspace.trainings.find((row) => row.id === trainingId);
  if (!training) {
    redirectManagerAssign("error", "That training is not in the catalog.", formData);
  }
  const eligible = workspace.participants.filter((participant) => {
    if (groupId && participant.groupId !== groupId) return false;
    if (!canAssignTrainingToGroup(training, workspace.reviews, participant.groupId)) {
      return false;
    }
    const card = workspace
      .trainingProgressFor(participant.fatherId)
      .find((row) => row.training.id === trainingId);
    return !card?.assigned;
  });

  if (eligible.length === 0) {
    redirectManagerAssign("notice", "Everyone who can receive this already has it.", formData);
  }

  const supabase = await createClient();
  let assigned = 0;
  for (const participant of eligible) {
    const result = await assignTrainingToFather(supabase, user, participant.fatherId, trainingId);
    if (result.status === "ok") {
      assigned += 1;
      await recordOrganizationActivity(supabase, {
        groupId: participant.groupId,
        actorId: user.id,
        kind: "training_assigned",
      });
    }
    if (result.status === "failed") {
      redirectManagerAssign("error", result.reason ?? "The assignment didn’t save.", formData);
    }
  }

  revalidatePath("/manager");
  revalidatePath("/manager/trainings");
  revalidatePath("/manager/participants");
  revalidatePath("/father");
  revalidatePath("/father/trainings");

  if (assigned === 0) {
    redirectManagerAssign("notice", "Everyone who can receive this already has it.", formData);
  }
  if (assigned === 1) {
    redirectManagerAssign("notice", "Assigned to 1 father.", formData);
  }
  redirectManagerAssign("notice", `Assigned to ${assigned} fathers.`, formData);
}
