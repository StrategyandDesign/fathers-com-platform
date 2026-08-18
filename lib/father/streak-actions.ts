"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { dismissStreakNoticeForUser } from "@/lib/father/streak-store";

export async function dismissStreakNotice(formData: FormData) {
  const { user } = await requireRole("father");
  const noticeId = String(formData.get("notice_id") ?? "").trim();
  if (!noticeId) return;
  try {
    await dismissStreakNoticeForUser(user.id, noticeId);
  } catch (error) {
    console.error("[streak] dismiss failed", error);
  }
  revalidatePath("/father");
}
