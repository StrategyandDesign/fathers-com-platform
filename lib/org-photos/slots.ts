export const HOME_HERO_SLOT = "home_hero" as const;
export const HOME_PROFILE_SLOT = "home_profile" as const;
export const ORG_LOGO_SLOT = "org_logo" as const;

export type HomeHeroSlot = typeof HOME_HERO_SLOT;
export type HomeProfileSlot = typeof HOME_PROFILE_SLOT;
export type OrgLogoSlot = typeof ORG_LOGO_SLOT;
export type TrainingPhotoSlot = `training_${string}`;
export type OrgPhotoSlot = HomeHeroSlot | HomeProfileSlot | OrgLogoSlot | TrainingPhotoSlot;

export type OrgPhotoKind = "home_hero" | "home_profile" | "org_logo" | "training";

export type OrgPhotoGuidance = {
  kind: OrgPhotoKind;
  slot: OrgPhotoSlot;
  surface: string;
  minWidth: number;
  minHeight: number;
  minAspect: number;
  maxAspect: number;
  aspectLabel: string;
  fileHint: string;
};

const FILE_HINT = "JPEG, PNG, or WebP. 5 MB max.";

export function trainingPhotoSlot(slug: string): TrainingPhotoSlot {
  return `training_${slug}`;
}

export function isHomeHeroSlot(slot: string): slot is HomeHeroSlot {
  return slot === HOME_HERO_SLOT;
}

export function isHomeProfileSlot(slot: string): slot is HomeProfileSlot {
  return slot === HOME_PROFILE_SLOT;
}

export function isOrgLogoSlot(slot: string): slot is OrgLogoSlot {
  return slot === ORG_LOGO_SLOT;
}

export function parseTrainingSlug(slot: string): string | null {
  if (!slot.startsWith("training_")) return null;
  const slug = slot.slice("training_".length);
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export function isOrgPhotoSlot(value: string, trainingSlugs: string[]): value is OrgPhotoSlot {
  if (value === HOME_HERO_SLOT || value === HOME_PROFILE_SLOT || value === ORG_LOGO_SLOT) {
    return true;
  }
  const slug = parseTrainingSlug(value);
  return Boolean(slug && trainingSlugs.includes(slug));
}

export function orgPhotoObjectPath(groupId: string, slot: OrgPhotoSlot) {
  return `${groupId}/${slot}`;
}

export function homeHeroGuidance(): OrgPhotoGuidance {
  return {
    kind: "home_hero",
    slot: HOME_HERO_SLOT,
    surface: "Home: Up Next",
    minWidth: 1200,
    minHeight: 360,
    minAspect: 1.6,
    maxAspect: 4.5,
    aspectLabel: "Any photo works. We crop it to fit this card.",
    fileHint: FILE_HINT,
  };
}

export function homeProfileGuidance(): OrgPhotoGuidance {
  return {
    kind: "home_profile",
    slot: HOME_PROFILE_SLOT,
    surface: "Home: Assessment",
    minWidth: 720,
    minHeight: 960,
    minAspect: 0.55,
    maxAspect: 1.2,
    aspectLabel: "Any photo works. We crop it to fit the Assessment card.",
    fileHint: FILE_HINT,
  };
}

export function trainingCardGuidance(slug: string, title: string): OrgPhotoGuidance {
  return {
    kind: "training",
    slot: trainingPhotoSlot(slug),
    surface: `Training card: ${title}`,
    minWidth: 800,
    minHeight: 450,
    minAspect: 1.2,
    maxAspect: 2.8,
    aspectLabel: "Any photo works. We crop it to fit the training cards.",
    fileHint: FILE_HINT,
  };
}

export type OrganizationPhotoSlotView = {
  slot: OrgPhotoSlot;
  guidance: OrgPhotoGuidance;
  where: string;
  applies: string;
  previewUrl: string | null;
  defaultUrl: string;
  isCustom: boolean;
  previewLabel: string;
};

export function slotCopy(orgName: string, kind: OrgPhotoKind) {
  const name = orgName.trim() || "this organization";
  if (kind === "home_hero") {
    return {
      where: `${name} participants will see this on Home, in the Up Next card.`,
      applies: `This change applies only to ${name}.`,
    };
  }
  if (kind === "home_profile") {
    return {
      where: `${name} participants will see this behind the Assessment card on Home.`,
      applies: `This change applies only to ${name}.`,
    };
  }
  return {
    where: `This photo appears on training cards for ${name}, on Home under Your Trainings, and on the Trainings page.`,
    applies: `This change applies only to ${name}.`,
  };
}
