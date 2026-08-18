"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/auth/roles";
import { getAuthContext, requireRole } from "@/lib/auth/session";
import { readImageMeta } from "@/lib/org-photos/image";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import {
  SUPPORT_SCREENSHOT_MAX_BYTES,
  SUPPORT_SCREENSHOT_MIME_TYPES,
  SUPPORT_SCREENSHOTS_BUCKET,
  supportScreenshotObjectPath,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  isSupportCategory,
  isSupportStatus,
  isSupportSubmitterRole,
  MESSAGE_MAX_LENGTH,
  PAGE_MAX_LENGTH,
  RECEIVED_NOTICE,
  SEND_FAILED_MESSAGE,
  supportHelpPath,
} from "@/lib/support/types";

const REPORT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

function revalidateInbox(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/support");
  if (id) revalidatePath(`/admin/support/${id}`);
}

export async function submitSupportReport(formData: FormData) {
  const { user, role } = await getAuthContext();
  if (!user || !role) {
    redirect("/login");
  }
  if (!isSupportSubmitterRole(role)) {
    redirect(ROLE_HOME[role]);
  }

  const path = supportHelpPath(role) ?? ROLE_HOME[role];
  if (!(await allowActionRateLimit("support.submit"))) {
    fail(path, "Too many reports just now. Try again in a few minutes.");
  }

  const categoryValue = String(formData.get("category") ?? "");
  if (!isSupportCategory(categoryValue)) {
    fail(path, "Choose a category.");
  }

  const message = String(formData.get("message") ?? "").trim();
  if (!message) {
    fail(path, "Write a message before sending.");
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    fail(path, `Keep the message under ${MESSAGE_MAX_LENGTH} characters.`);
  }

  const page = String(formData.get("page") ?? "").trim().slice(0, PAGE_MAX_LENGTH) || null;
  const file = formData.get("screenshot");
  let screenshotPath: string | null = null;

  const supabase = await createClient();

  if (file instanceof File && file.size > 0) {
    if (file.size > SUPPORT_SCREENSHOT_MAX_BYTES) {
      fail(path, "Screenshot must be 2 MB or smaller.");
    }
    if (
      !SUPPORT_SCREENSHOT_MIME_TYPES.includes(
        file.type as (typeof SUPPORT_SCREENSHOT_MIME_TYPES)[number]
      )
    ) {
      fail(path, "Use a JPEG, PNG, or WebP.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!readImageMeta(bytes)) {
      fail(path, "Use a JPEG, PNG, or WebP.");
    }

    screenshotPath = supportScreenshotObjectPath(user.id, file.type);
    const { error: uploadError } = await supabase.storage
      .from(SUPPORT_SCREENSHOTS_BUCKET)
      .upload(screenshotPath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      fail(path, SEND_FAILED_MESSAGE);
    }
  }

  const { error } = await supabase.from("support_reports").insert({
    submitter_id: user.id,
    submitter_role: role,
    category: categoryValue,
    page,
    message,
    screenshot_path: screenshotPath,
  });

  if (error) {
    if (screenshotPath) {
      await supabase.storage.from(SUPPORT_SCREENSHOTS_BUCKET).remove([screenshotPath]);
    }
    fail(path, SEND_FAILED_MESSAGE);
  }

  revalidateInbox();
  ok(path, RECEIVED_NOTICE);
}

export async function updateSupportStatus(formData: FormData) {
  await requireRole("admin");

  const id = String(formData.get("report_id") ?? "").trim();
  const statusValue = String(formData.get("status") ?? "");
  const path = REPORT_ID.test(id) ? `/admin/support/${id}` : "/admin/support";

  if (!REPORT_ID.test(id)) {
    fail("/admin/support", "That report was not found.");
  }
  if (!isSupportStatus(statusValue)) {
    fail(path, "Choose a status.");
  }
  if (!(await allowActionRateLimit("admin.support"))) {
    fail(path, "Too many updates just now. Try again in a minute.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_reports")
    .update({ status: statusValue })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    fail(path, "Unable to update that report. Please try again.");
  }

  revalidateInbox(id);
  const notice =
    statusValue === "resolved"
      ? "Marked as resolved."
      : statusValue === "looking"
        ? "Marked as looking into it."
        : "Moved back to new.";
  ok(path, notice);
}
