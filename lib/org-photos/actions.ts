"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { loadCatalogTrainings } from "@/lib/org-photos/data";
import { readImageMeta, validateOrgPhoto } from "@/lib/org-photos/image";
import {
  HOME_HERO_SLOT,
  homeHeroGuidance,
  isOrgPhotoSlot,
  orgPhotoObjectPath,
  parseTrainingSlug,
  trainingCardGuidance,
  type OrgPhotoGuidance,
  type OrgPhotoSlot,
} from "@/lib/org-photos/slots";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import {
  ORG_PHOTO_MAX_BYTES,
  ORG_PHOTO_MIME_TYPES,
  ORG_PHOTOS_BUCKET,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

const PHOTOS_PATH = "/manager/account/photos";

function fail(message: string): never {
  redirect(`${PHOTOS_PATH}?error=${encodeURIComponent(message)}`);
}

function ok(notice: string): never {
  redirect(`${PHOTOS_PATH}?notice=${encodeURIComponent(notice)}`);
}

function revalidateOrgPhotos() {
  revalidatePath(PHOTOS_PATH);
  revalidatePath("/manager/account");
  revalidatePath("/father");
  revalidatePath("/father/trainings");
}

async function guidanceForSlot(
  slot: OrgPhotoSlot,
  trainings: Array<{ slug: string; title: string }>
): Promise<OrgPhotoGuidance> {
  if (slot === HOME_HERO_SLOT) return homeHeroGuidance();
  const slug = parseTrainingSlug(slot);
  const training = trainings.find((row) => row.slug === slug);
  return trainingCardGuidance(slug ?? slot, training?.title ?? "Training");
}

async function requireManagedGroup(groupId: string) {
  const { user } = await requireRole("manager");
  if (!groupId) fail("Choose an organization.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, manager_id")
    .eq("id", groupId)
    .maybeSingle();

  if (error) fail("Couldn’t load that organization. Try again.");
  if (!data || data.manager_id !== user.id) {
    fail("That organization isn’t yours.");
  }

  return { user, organization: data as { id: string; name: string; manager_id: string } };
}

export async function uploadOrganizationPhoto(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const slotValue = String(formData.get("slot") ?? "");
  const { user, organization } = await requireManagedGroup(groupId);

  if (!(await allowActionRateLimit("account.org_photo"))) {
    fail("Too many photo uploads. Wait a few minutes and try again.");
  }

  const trainings = await loadCatalogTrainings();
  const slugs = trainings.map((training) => training.slug);
  if (!isOrgPhotoSlot(slotValue, slugs)) {
    fail("That photo slot isn’t available.");
  }
  const slot = slotValue;
  const guidance = await guidanceForSlot(slot, trainings);

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    fail("Choose a photo to upload.");
  }
  if (file.size > ORG_PHOTO_MAX_BYTES) {
    fail("Photo must be 5 MB or smaller.");
  }
  if (!ORG_PHOTO_MIME_TYPES.includes(file.type as (typeof ORG_PHOTO_MIME_TYPES)[number])) {
    fail("Use a JPEG, PNG, or WebP.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const invalid = validateOrgPhoto(readImageMeta(bytes), guidance);
  if (invalid) fail(invalid);

  const supabase = await createClient();
  const objectPath = orgPhotoObjectPath(organization.id, slot);
  const { error: uploadError } = await supabase.storage
    .from(ORG_PHOTOS_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    fail("The photo didn’t save. Try a JPEG, PNG, or WebP under 5 MB.");
  }

  const { error } = await supabase.from("organization_photos").upsert({
    group_id: organization.id,
    slot,
    storage_path: objectPath,
    updated_by: user.id,
  });

  if (error) {
    fail("The photo didn’t save. Try again.");
  }

  revalidateOrgPhotos();
  ok(`Photo updated for ${organization.name.trim() || "this organization"}.`);
}

export async function resetOrganizationPhoto(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  const slotValue = String(formData.get("slot") ?? "");
  const { organization } = await requireManagedGroup(groupId);

  if (!(await allowActionRateLimit("account.org_photo"))) {
    fail("Too many photo changes. Wait a few minutes and try again.");
  }

  const trainings = await loadCatalogTrainings();
  const slugs = trainings.map((training) => training.slug);
  if (!isOrgPhotoSlot(slotValue, slugs)) {
    fail("That photo slot isn’t available.");
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
    fail("Couldn’t reset that photo. Try again.");
  }

  await supabase.storage.from(ORG_PHOTOS_BUCKET).remove([objectPath]);

  revalidateOrgPhotos();
  ok(`Reset to the platform default for ${organization.name.trim() || "this organization"}.`);
}
