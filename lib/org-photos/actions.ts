"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { loadCatalogTrainings } from "@/lib/org-photos/data";
import { trainingCoverSlug } from "@/lib/trainings/series";
import { readImageMeta, validateOrgPhoto } from "@/lib/org-photos/image";
import { isOrgPhotoSlot, orgPhotoObjectPath } from "@/lib/org-photos/slots";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import {
  ORG_PHOTO_MAX_BYTES,
  ORG_PHOTO_MIME_TYPES,
  ORG_PHOTOS_BUCKET,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type OrganizationPhotoResult = {
  error?: string;
  notice?: string;
};

function revalidateOrgPhotos() {
  revalidatePath("/manager/account");
  revalidatePath("/manager/account/photos");
  revalidatePath("/manager");
  revalidatePath("/father", "layout");
  revalidatePath("/father/trainings");
}

async function requireManagedGroup(groupId: string) {
  const { user } = await requireRole("manager");
  if (!groupId) return { error: "Choose an organization." } as const;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, manager_id")
    .eq("id", groupId)
    .maybeSingle();

  if (error) return { error: "Couldn’t load that organization. Try again." } as const;
  if (!data || data.manager_id !== user.id) {
    return { error: "That organization isn’t yours." } as const;
  }

  return {
    user,
    organization: data as { id: string; name: string; manager_id: string },
  };
}

export async function uploadOrganizationPhoto(
  formData: FormData
): Promise<OrganizationPhotoResult> {
  const groupId = String(formData.get("group_id") ?? "");
  const slotValue = String(formData.get("slot") ?? "");
  const access = await requireManagedGroup(groupId);
  if ("error" in access) return access;
  const { user, organization } = access;

  if (!(await allowActionRateLimit("account.org_photo"))) {
    return { error: "Too many photo uploads. Wait a few minutes and try again." };
  }

  const trainings = await loadCatalogTrainings();
  const slugs = [...new Set(trainings.map((training) => trainingCoverSlug(training)))];
  if (!isOrgPhotoSlot(slotValue, slugs)) {
    return { error: "That photo slot isn’t available." };
  }
  const slot = slotValue;

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (file.size > ORG_PHOTO_MAX_BYTES) {
    return { error: "Photo must be 5 MB or smaller." };
  }
  if (!ORG_PHOTO_MIME_TYPES.includes(file.type as (typeof ORG_PHOTO_MIME_TYPES)[number])) {
    return { error: "Use a JPEG, PNG, or WebP." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const invalid = validateOrgPhoto(readImageMeta(bytes));
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const objectPath = orgPhotoObjectPath(organization.id, slot);
  const { error: uploadError } = await supabase.storage
    .from(ORG_PHOTOS_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: "The photo didn’t save. Try a JPEG, PNG, or WebP under 5 MB." };
  }

  const { error } = await supabase.from("organization_photos").upsert({
    group_id: organization.id,
    slot,
    storage_path: objectPath,
    updated_by: user.id,
  });

  if (error) {
    return { error: "The photo didn’t save. Try again." };
  }

  revalidateOrgPhotos();
  return { notice: "Photo saved." };
}

export async function resetOrganizationPhoto(
  formData: FormData
): Promise<OrganizationPhotoResult> {
  const groupId = String(formData.get("group_id") ?? "");
  const slotValue = String(formData.get("slot") ?? "");
  const access = await requireManagedGroup(groupId);
  if ("error" in access) return access;
  const { organization } = access;

  if (!(await allowActionRateLimit("account.org_photo"))) {
    return { error: "Too many photo changes. Wait a few minutes and try again." };
  }

  const trainings = await loadCatalogTrainings();
  const slugs = [...new Set(trainings.map((training) => trainingCoverSlug(training)))];
  if (!isOrgPhotoSlot(slotValue, slugs)) {
    return { error: "That photo slot isn’t available." };
  }
  const slot = slotValue;
  const objectPath = orgPhotoObjectPath(organization.id, slot);
  const supabase = await createClient();

  const { error: deleteRowError } = await supabase
    .from("organization_photos")
    .delete()
    .eq("group_id", organization.id)
    .eq("slot", slot);

  if (deleteRowError) {
    return { error: "Couldn’t reset that photo. Try again." };
  }

  await supabase.storage.from(ORG_PHOTOS_BUCKET).remove([objectPath]);

  revalidateOrgPhotos();
  return { notice: "Reset to the platform default." };
}
