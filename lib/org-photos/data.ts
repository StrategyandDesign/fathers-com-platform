import {
  photoPackForCode,
  profileCover,
  sessionCover,
  trainingCover,
  type PhotoPack,
} from "@/lib/brand/photos";
import { isTrainingPublished, type Training } from "@/lib/father/types";
import { loadManagerGroups } from "@/lib/manager/data";
import type { Group } from "@/lib/manager/types";
import {
  HOME_HERO_SLOT,
  HOME_PROFILE_SLOT,
  homeHeroGuidance,
  homeProfileGuidance,
  parseTrainingSlug,
  slotCopy,
  trainingCardGuidance,
  trainingPhotoSlot,
  type OrganizationPhotoSlotView,
} from "@/lib/org-photos/slots";
import { ORG_PHOTOS_BUCKET, signStorageUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type { OrganizationPhotoSlotView };

export type OrganizationPhotoRow = {
  group_id: string;
  slot: string;
  storage_path: string;
  updated_at: string;
};

export type OrganizationPhotoSection = {
  organization: Group;
  slots: OrganizationPhotoSlotView[];
};

export type FatherOrgPhotoCovers = {
  organizationName: string | null;
  heroUrl: string | null;
  profileUrl: string | null;
  trainingUrls: Record<string, string>;
  photoPack: PhotoPack;
};

/**
 * Trainings already have distinct covers via trainingCover(slug).
 * Only fundamentals ships a platform photo; anger/reentry fall back to SceneArt.
 * Store one override per training slug so each card can be customized.
 * Home hero is a single org slot (the Up Next card), not per-session.
 * Fathers in more than one group use the earliest membership for overrides.
 */
export function resolveHomeHeroCover(
  sessionNumber: number,
  customUrl?: string | null,
  pack: PhotoPack = "default"
) {
  return customUrl || sessionCover(sessionNumber, pack);
}

export function resolveTrainingCardCover(
  slug: string,
  customUrl?: string | null,
  pack: PhotoPack = "default"
) {
  return customUrl || trainingCover(slug, pack);
}

export function resolveHomeProfileCover(
  customUrl?: string | null,
  pack: PhotoPack = "default"
) {
  return customUrl || profileCover(pack);
}

function organizationName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed || "this organization";
}

async function loadPhotoRows(groupIds: string[]) {
  if (groupIds.length === 0) return [] as OrganizationPhotoRow[];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_photos")
    .select("group_id, slot, storage_path, updated_at")
    .in("group_id", groupIds);
  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /organization_photos/i.test(error.message);
    if (missing) return [];
    throw error;
  }
  return (data ?? []) as OrganizationPhotoRow[];
}

export async function loadCatalogTrainings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .select("id, slug, title, description, session_count, order_index, published")
    .order("order_index");
  if (error) throw error;
  return ((data ?? []) as Training[]).filter((training) => isTrainingPublished(training));
}

export async function loadManagerOrganizationPhotos(
  managerId: string
): Promise<OrganizationPhotoSection[]> {
  const [organizations, trainings] = await Promise.all([
    loadManagerGroups(managerId),
    loadCatalogTrainings(),
  ]);
  const rows = await loadPhotoRows(organizations.map((org) => org.id));
  const supabase = await createClient();
  const signed = await signStorageUrls(
    supabase,
    ORG_PHOTOS_BUCKET,
    rows.map((row) => row.storage_path)
  );

  const rowsByGroup = new Map<string, Map<string, OrganizationPhotoRow>>();
  for (const row of rows) {
    const map = rowsByGroup.get(row.group_id) ?? new Map<string, OrganizationPhotoRow>();
    map.set(row.slot, row);
    rowsByGroup.set(row.group_id, map);
  }

  return organizations.map((organization) => {
    const orgName = organizationName(organization.name);
    const pack = photoPackForCode(organization.code);
    const custom = rowsByGroup.get(organization.id) ?? new Map();
    const slots: OrganizationPhotoSlotView[] = [];

    const heroGuidance = homeHeroGuidance();
    const heroRow = custom.get(HOME_HERO_SLOT);
    const heroCustom = heroRow ? signed.get(heroRow.storage_path) ?? null : null;
    const heroCopy = slotCopy(orgName, "home_hero");
    slots.push({
      slot: HOME_HERO_SLOT,
      guidance: heroGuidance,
      where: heroCustom
        ? heroCopy.where
        : `${heroCopy.where} Until you replace it, the card uses the platform photo for whichever session is next.`,
      applies: heroCopy.applies,
      previewUrl: heroCustom,
      defaultUrl: sessionCover(1, pack),
      isCustom: Boolean(heroCustom),
      previewLabel: heroCustom
        ? `Custom for ${orgName}`
        : "Platform default (next session’s photo)",
    });

    const profileGuidance = homeProfileGuidance();
    const profileRow = custom.get(HOME_PROFILE_SLOT);
    const profileCustom = profileRow ? signed.get(profileRow.storage_path) ?? null : null;
    const profileCopy = slotCopy(orgName, "home_profile");
    slots.push({
      slot: HOME_PROFILE_SLOT,
      guidance: profileGuidance,
      where: profileCustom
        ? profileCopy.where
        : `${profileCopy.where} Until you replace it, the card uses the platform photo.`,
      applies: profileCopy.applies,
      previewUrl: profileCustom,
      defaultUrl: profileCover(pack),
      isCustom: Boolean(profileCustom),
      previewLabel: profileCustom ? `Custom for ${orgName}` : "Platform default",
    });

    for (const training of trainings) {
      const guidance = trainingCardGuidance(training.slug, training.title);
      const row = custom.get(trainingPhotoSlot(training.slug));
      const customUrl = row ? signed.get(row.storage_path) ?? null : null;
      const copy = slotCopy(orgName, "training");
      slots.push({
        slot: guidance.slot,
        guidance,
        where: copy.where,
        applies: copy.applies,
        previewUrl: customUrl,
        defaultUrl: trainingCover(training.slug, pack),
        isCustom: Boolean(customUrl),
        previewLabel: customUrl ? `Custom for ${orgName}` : "Platform default",
      });
    }

    return { organization, slots };
  });
}

export async function loadFatherOrgPhotoCovers(
  fatherId: string
): Promise<FatherOrgPhotoCovers> {
  const empty: FatherOrgPhotoCovers = {
    organizationName: null,
    heroUrl: null,
    profileUrl: null,
    trainingUrls: {},
    photoPack: "default",
  };

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return empty;
  }

  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .select("group_id, joined_at")
    .eq("father_id", fatherId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError || !membership?.group_id) return empty;

  let groupRes;
  let rows: OrganizationPhotoRow[] = [];
  try {
    [groupRes, rows] = await Promise.all([
      supabase.from("groups").select("id, name, code").eq("id", membership.group_id).maybeSingle(),
      loadPhotoRows([membership.group_id]),
    ]);
  } catch {
    return empty;
  }
  if (groupRes.error) return empty;

  const signed = await signStorageUrls(
    supabase,
    ORG_PHOTOS_BUCKET,
    rows.map((row) => row.storage_path)
  );

  const trainingUrls: Record<string, string> = {};
  let heroUrl: string | null = null;
  let profileUrl: string | null = null;
  for (const row of rows) {
    const url = signed.get(row.storage_path);
    if (!url) continue;
    if (row.slot === HOME_HERO_SLOT) {
      heroUrl = url;
      continue;
    }
    if (row.slot === HOME_PROFILE_SLOT) {
      profileUrl = url;
      continue;
    }
    const slug = parseTrainingSlug(row.slot);
    if (slug) trainingUrls[slug] = url;
  }

  return {
    organizationName: organizationName(groupRes.data?.name),
    heroUrl,
    profileUrl,
    trainingUrls,
    photoPack: photoPackForCode(
      (groupRes.data as { code?: string | null } | null)?.code
    ),
  };
}
