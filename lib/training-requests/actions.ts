"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadManagerGroups } from "@/lib/manager/data";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  AUDIENCE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  isTrainingRequestStatus,
  RECEIVED_NOTICE,
  SEND_FAILED_MESSAGE,
  TOPIC_MAX_LENGTH,
  TRAINING_REQUEST_STATUS_LABEL,
} from "@/lib/training-requests/types";

const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FORM_PATH = "/manager/request";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateRequests(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/support");
  revalidatePath("/admin/support/requests");
  if (id) revalidatePath(`/admin/support/requests/${id}`);
}

export async function submitTrainingRequest(formData: FormData) {
  const { user } = await requireRole("manager");

  if (!(await allowActionRateLimit("manager.training_request"))) {
    fail(FORM_PATH, "Too many requests just now. Try again in a few minutes.");
  }

  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) {
    fail(FORM_PATH, "Add a topic or suggested title.");
  }
  if (topic.length > TOPIC_MAX_LENGTH) {
    fail(FORM_PATH, `Keep the topic under ${TOPIC_MAX_LENGTH} characters.`);
  }

  const description = String(formData.get("description") ?? "").trim();
  if (!description) {
    fail(FORM_PATH, "Say why this training is needed.");
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    fail(FORM_PATH, `Keep the description under ${DESCRIPTION_MAX_LENGTH} characters.`);
  }

  const audience =
    String(formData.get("audience") ?? "").trim().slice(0, AUDIENCE_MAX_LENGTH) || null;

  const groupIdValue = String(formData.get("group_id") ?? "").trim();
  let groupId: string | null = null;
  if (groupIdValue) {
    if (!REQUEST_ID.test(groupIdValue)) {
      fail(FORM_PATH, SEND_FAILED_MESSAGE);
    }
    const groups = await loadManagerGroups(user.id);
    if (!groups.some((group) => group.id === groupIdValue)) {
      fail(FORM_PATH, SEND_FAILED_MESSAGE);
    }
    groupId = groupIdValue;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("training_requests").insert({
    manager_id: user.id,
    group_id: groupId,
    topic,
    description,
    audience,
  });

  if (error) {
    fail(FORM_PATH, SEND_FAILED_MESSAGE);
  }

  revalidateRequests();
  ok(FORM_PATH, RECEIVED_NOTICE);
}

export async function updateTrainingRequestStatus(formData: FormData) {
  await requireRole("admin");

  const id = String(formData.get("request_id") ?? "").trim();
  const statusValue = String(formData.get("status") ?? "");
  const path = REQUEST_ID.test(id)
    ? `/admin/support/requests/${id}`
    : "/admin/support/requests";

  if (!REQUEST_ID.test(id)) {
    fail("/admin/support/requests", "That request was not found.");
  }
  if (!isTrainingRequestStatus(statusValue)) {
    fail(path, "Choose a status.");
  }
  if (!(await allowActionRateLimit("admin.training_request"))) {
    fail(path, "Too many updates just now. Try again in a minute.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_requests")
    .update({ status: statusValue })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    fail(path, "Unable to update that request. Please try again.");
  }

  revalidateRequests(id);
  const notice =
    statusValue === "new"
      ? "Moved back to new."
      : `Marked as ${TRAINING_REQUEST_STATUS_LABEL[statusValue].toLowerCase()}.`;
  ok(path, notice);
}
