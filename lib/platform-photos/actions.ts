"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { readImageMeta, validateLoginBackground } from "@/lib/platform-photos/image";
import {
  LOGIN_BACKGROUND_OBJECT_PATH,
  LOGIN_BACKGROUND_SLOT,
  isLoginBackgroundSlot,
} from "@/lib/platform-photos/slots";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import {
  LOGIN_BACKGROUND_MAX_BYTES,
  LOGIN_BACKGROUND_MIME_TYPES,
  PLATFORM_PHOTOS_BUCKET,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type PlatformPhotoResult = {
  error?: string;
  notice?: string;
};

function revalidateLoginBackground() {
  revalidatePath("/login");
  revalidatePath("/signup");
  revalidatePath("/join/leader");
  revalidatePath("/admin");
  revalidatePath("/admin/appearance");
}

export async function uploadLoginBackground(
  formData: FormData
): Promise<PlatformPhotoResult> {
  const { user } = await requireRole("admin");

  if (!(await allowActionRateLimit("admin.platform_photo"))) {
    return { error: "Too many photo uploads. Wait a few minutes and try again." };
  }

  const slotValue = String(formData.get("slot") ?? LOGIN_BACKGROUND_SLOT);
  if (!isLoginBackgroundSlot(slotValue)) {
    return { error: "That photo slot isn’t available." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (file.size > LOGIN_BACKGROUND_MAX_BYTES) {
    return { error: "Photo must be 8 MB or smaller." };
  }
  if (
    !LOGIN_BACKGROUND_MIME_TYPES.includes(
      file.type as (typeof LOGIN_BACKGROUND_MIME_TYPES)[number]
    )
  ) {
    return { error: "Use a JPEG, PNG, or WebP." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const invalid = validateLoginBackground(readImageMeta(bytes));
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(PLATFORM_PHOTOS_BUCKET)
    .upload(LOGIN_BACKGROUND_OBJECT_PATH, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: "The photo didn’t save. Try a JPEG, PNG, or WebP under 8 MB." };
  }

  const { error } = await supabase.from("platform_photos").upsert({
    slot: LOGIN_BACKGROUND_SLOT,
    storage_path: LOGIN_BACKGROUND_OBJECT_PATH,
    updated_by: user.id,
  });

  if (error) {
    return { error: "The photo didn’t save. Try again." };
  }

  revalidateLoginBackground();
  return { notice: "Photo saved. Everyone will see it on the next login." };
}

export async function resetLoginBackground(
  formData: FormData
): Promise<PlatformPhotoResult> {
  await requireRole("admin");

  if (!(await allowActionRateLimit("admin.platform_photo"))) {
    return { error: "Too many photo changes. Wait a few minutes and try again." };
  }

  const slotValue = String(formData.get("slot") ?? LOGIN_BACKGROUND_SLOT);
  if (!isLoginBackgroundSlot(slotValue)) {
    return { error: "That photo slot isn’t available." };
  }

  const supabase = await createClient();
  const { error: deleteRowError } = await supabase
    .from("platform_photos")
    .delete()
    .eq("slot", LOGIN_BACKGROUND_SLOT);

  if (deleteRowError) {
    return { error: "Couldn’t reset that photo. Try again." };
  }

  await supabase.storage
    .from(PLATFORM_PHOTOS_BUCKET)
    .remove([LOGIN_BACKGROUND_OBJECT_PATH]);

  revalidateLoginBackground();
  return { notice: "Reset to the platform default." };
}
