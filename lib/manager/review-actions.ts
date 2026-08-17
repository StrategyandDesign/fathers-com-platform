"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import {
  DECLINE_REASON_MAX,
  isReviewStatus,
  REVERSE_ACCEPT_CONFIRM,
} from "@/lib/manager/reviews";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function reviewPath(trainingId: string, groupId: string) {
  return `/manager/reviews/${trainingId}?group=${encodeURIComponent(groupId)}`;
}

function revalidateReviews(trainingId: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/reviews");
  revalidatePath(`/manager/reviews/${trainingId}`);
  revalidatePath("/manager/participants");
  revalidatePath("/father");
  revalidatePath("/father/trainings");
}

async function decideReview(formData: FormData, status: "accepted" | "declined") {
  const { user } = await requireRole("manager");
  const trainingId = String(formData.get("training_id") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim();
  const reason = String(formData.get("decline_reason") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();
  const path =
    returnTo === "queue"
      ? "/manager/reviews"
      : trainingId && groupId
        ? reviewPath(trainingId, groupId)
        : "/manager/reviews";

  if (!UUID.test(trainingId) || !UUID.test(groupId)) {
    fail("/manager/reviews", "Choose a training to review.");
  }
  if (!(await allowActionRateLimit("manager.review"))) {
    fail(path, "Too many review actions just now. Try again in a minute.");
  }
  if (status === "declined" && reason.length > DECLINE_REASON_MAX) {
    fail(path, `Keep the note under ${DECLINE_REASON_MAX} characters.`);
  }

  const supabase = await createClient();
  const { data: allowed, error: allowedError } = await supabase.rpc("is_manager_of_group", {
    group_id: groupId,
  });
  if (allowedError) {
    fail(path, "Couldn’t verify this organization. Try again.");
  }
  if (!allowed) {
    fail("/manager/reviews", "That training is not in your organization.");
  }

  const { data: current, error: currentError } = await supabase
    .from("organization_training_reviews")
    .select("status")
    .eq("group_id", groupId)
    .eq("training_id", trainingId)
    .maybeSingle();

  if (currentError) {
    fail(path, "Couldn’t load that review. Try again.");
  }
  if (!current || !isReviewStatus(current.status)) {
    fail("/manager/reviews", "That training is not waiting on your review.");
  }

  if (status === "accepted" && current.status === "declined") {
    if (confirm !== REVERSE_ACCEPT_CONFIRM) {
      fail(path, `Type ${REVERSE_ACCEPT_CONFIRM} to accept this training after declining it.`);
    }
    const { data: catalog, error: catalogError } = await supabase
      .from("trainings")
      .select("released_at")
      .eq("id", trainingId)
      .maybeSingle();
    if (catalogError) {
      fail(path, "Couldn’t check this training. Try again.");
    }
    if (!catalog?.released_at) {
      fail(path, "This training is no longer released. A Super-admin must release it again.");
    }
  }

  const { error } = await supabase
    .from("organization_training_reviews")
    .update({
      status,
      decline_reason: status === "declined" ? reason || null : null,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("group_id", groupId)
    .eq("training_id", trainingId);

  if (error) {
    fail(path, "The decision didn’t save. Try again.");
  }

  revalidateReviews(trainingId);

  if (status === "accepted") {
    ok(
      path,
      current.status === "declined"
        ? "Training is available to assign again."
        : "Training is available to assign. Fathers are not enrolled until you assign it."
    );
  }

  ok(
    path,
    current.status === "accepted"
      ? "Training is hidden from new assignment for your organization."
      : "Training is hidden from your organization."
  );
}

export async function acceptTrainingRelease(formData: FormData) {
  await decideReview(formData, "accepted");
}

export async function declineTrainingRelease(formData: FormData) {
  await decideReview(formData, "declined");
}
