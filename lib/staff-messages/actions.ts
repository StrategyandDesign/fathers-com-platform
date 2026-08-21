"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/auth/roles";
import { getAuthContext, requireRole } from "@/lib/auth/session";
import { requestPathname } from "@/lib/http/pathname";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  filterStaffMessageRecipients,
  isStaffMessageAudience,
  normalizeStaffMessage,
  staffMessageAudienceNeedsPicks,
  STAFF_MESSAGE_MAX,
} from "@/lib/staff-messages/types";
import { loadStaffMessageDirectory } from "@/lib/staff-messages/data";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateStaffMessages() {
  revalidatePath("/admin");
  revalidatePath("/admin/messages");
  revalidatePath("/manager");
  revalidatePath("/reviewer");
  revalidatePath("/reviewer/summary");
}

export async function sendStaffMessage(formData: FormData) {
  const { role } = await requireRole("admin");
  if (role !== "admin") {
    redirect(`${ROLE_HOME[role]}?error=${encodeURIComponent("You need Super-admin access.")}`);
  }

  const path = "/admin/messages";
  if (!(await allowActionRateLimit("admin.message"))) {
    fail(path, "admin.messages.tooMany");
  }

  const body = normalizeStaffMessage(String(formData.get("body") ?? ""));
  const audienceRaw = String(formData.get("audience") ?? "").trim();
  const selectedIds = formData
    .getAll("profile_id")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!body) fail(path, "admin.messages.bodyRequired");
  if (body.length > STAFF_MESSAGE_MAX) fail(path, "admin.messages.bodyTooLong");
  if (!isStaffMessageAudience(audienceRaw)) fail(path, "admin.messages.chooseAudience");

  const people = await loadStaffMessageDirectory();
  const recipients = filterStaffMessageRecipients(people, audienceRaw, selectedIds);
  if (recipients.some((person) => person.role !== "manager" && person.role !== "reviewer")) {
    fail(path, "admin.messages.chooseRecipients");
  }
  if (staffMessageAudienceNeedsPicks(audienceRaw) && recipients.length === 0) {
    fail(path, "admin.messages.chooseRecipients");
  }
  if (recipients.length === 0) fail(path, "admin.messages.chooseRecipients");

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_platform_staff_message", {
    p_body: body,
    p_audience: audienceRaw,
    p_profile_ids: staffMessageAudienceNeedsPicks(audienceRaw)
      ? recipients.map((person) => person.id)
      : null,
  });
  if (error) {
    console.error("[staff-messages] send failed", error.code, error.message);
    const text = error.message ?? "";
    if (text.includes("Write a message first")) fail(path, "admin.messages.bodyRequired");
    if (text.includes("Keep the message under")) fail(path, "admin.messages.bodyTooLong");
    if (text.includes("Choose who should receive")) fail(path, "admin.messages.chooseAudience");
    if (text.includes("Select at least one")) fail(path, "admin.messages.chooseRecipients");
    fail(path, "admin.messages.failed");
  }

  revalidateStaffMessages();
  ok(path, recipients.length === 1 ? "admin.messages.sentOne" : "admin.messages.sent");
}

export async function dismissStaffMessage(formData: FormData) {
  const { user, role } = await getAuthContext();
  if (!user || (role !== "manager" && role !== "reviewer")) {
    redirect("/login");
  }

  const messageId = String(formData.get("message_id") ?? "").trim();
  const current = await requestPathname();
  const path =
    current.startsWith("/manager") || current.startsWith("/reviewer")
      ? current
      : ROLE_HOME[role];
  if (!messageId) fail(path, "staff.ribbon.dismissFailed");

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_staff_message_recipients")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("message_id", messageId)
    .eq("profile_id", user.id);
  if (error) {
    console.error("[staff-messages] dismiss failed", error.code, error.message);
    fail(path, "staff.ribbon.dismissFailed");
  }

  revalidateStaffMessages();
  redirect(path);
}
