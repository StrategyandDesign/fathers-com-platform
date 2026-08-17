"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { assignTrainingToFather } from "@/lib/manager/mutations";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message: string): never {
  redirect(`/manager/trainings?error=${encodeURIComponent(message)}`);
}

function ok(notice: string): never {
  redirect(`/manager/trainings?notice=${encodeURIComponent(notice)}`);
}

export async function assignTrainingToUnassigned(formData: FormData) {
  const { user } = await requireRole("manager");
  const trainingId = String(formData.get("training_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();

  if (!UUID.test(trainingId)) {
    fail("Choose a training.");
  }
  if (groupId && !UUID.test(groupId)) {
    fail("Choose a training.");
  }
  if (!(await allowActionRateLimit("manager.bulk"))) {
    fail("Too many bulk actions just now. Try again in a few minutes.");
  }

  const workspace = await loadManagerWorkspace(user.id);
  const eligible = workspace.participants.filter((participant) => {
    if (groupId && participant.groupId !== groupId) return false;
    const card = workspace
      .trainingProgressFor(participant.fatherId)
      .find((row) => row.training.id === trainingId);
    return !card?.assigned;
  });

  if (eligible.length === 0) {
    ok("Everyone who can receive this already has it.");
  }

  const supabase = await createClient();
  let assigned = 0;
  for (const participant of eligible) {
    const result = await assignTrainingToFather(supabase, user, participant.fatherId, trainingId);
    if (result.status === "ok") assigned += 1;
    if (result.status === "failed") {
      fail(result.reason ?? "The assignment didn’t save.");
    }
  }

  revalidatePath("/manager");
  revalidatePath("/manager/trainings");
  revalidatePath("/manager/participants");
  revalidatePath("/father");
  revalidatePath("/father/trainings");

  if (assigned === 0) {
    ok("Everyone who can receive this already has it.");
  }
  if (assigned === 1) {
    ok("Assigned to 1 father.");
  }
  ok(`Assigned to ${assigned} fathers.`);
}
