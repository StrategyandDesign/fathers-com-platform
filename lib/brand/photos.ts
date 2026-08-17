export const BRAND_PHOTOS = {
  shoulders: "/brand/photos/hero-shoulders.png",
  running: "/brand/photos/showing-up-running.png",
  highfive: "/brand/photos/affirming-highfive.png",
  woods: "/brand/photos/modeling-woods.png",
  teen: "/brand/photos/commitment-teen.png",
  park: "/brand/photos/knowing-park.png",
  bike: "/brand/photos/protecting-bike.png",
  profile: "/brand/photos/profile-placeholder.png",
} as const;

/** Landscape placeholders for Unit 8200 (code IL) only. */
export const IL_PHOTOS = {
  hero: "/brand/photos/il/hero.png",
  hills: "/brand/photos/il/hills.png",
  desert: "/brand/photos/il/desert.png",
  grove: "/brand/photos/il/grove.png",
} as const;

export type PhotoPack = "default" | "il";

export function photoPackForCode(code?: string | null): PhotoPack {
  return code?.trim().toUpperCase() === "IL" ? "il" : "default";
}

const IL_SESSION_CYCLE = [IL_PHOTOS.hero, IL_PHOTOS.hills, IL_PHOTOS.desert, IL_PHOTOS.grove] as const;

const SESSION_CYCLE = [
  BRAND_PHOTOS.shoulders,
  BRAND_PHOTOS.teen,
  BRAND_PHOTOS.park,
  BRAND_PHOTOS.running,
  BRAND_PHOTOS.bike,
  BRAND_PHOTOS.highfive,
  BRAND_PHOTOS.woods,
] as const;

/** Fundamentals sessions 1–9. Later numbers cycle the seven photos. */
const SESSION_COVERS: Record<number, string> = {
  1: BRAND_PHOTOS.shoulders, // Training Overview
  2: BRAND_PHOTOS.teen, // Commitment
  3: BRAND_PHOTOS.park, // Knowing Your Child
  4: BRAND_PHOTOS.running, // Showing Up Consistently
  5: BRAND_PHOTOS.bike, // Protecting and Providing
  6: BRAND_PHOTOS.highfive, // Affirming and Encouraging
  7: BRAND_PHOTOS.teen, // Disciplining with Love
  8: BRAND_PHOTOS.woods, // Modeling Integrity and Faith
  9: BRAND_PHOTOS.shoulders, // Bonus Eighth Secret
};

export function sessionCover(sessionNumber: number, pack: PhotoPack = "default"): string {
  if (pack === "il") {
    const index = Math.abs(Math.trunc(sessionNumber) - 1) % IL_SESSION_CYCLE.length;
    return IL_SESSION_CYCLE[index] ?? IL_PHOTOS.hero;
  }
  const mapped = SESSION_COVERS[sessionNumber];
  if (mapped) return mapped;
  const index = Math.abs(Math.trunc(sessionNumber) - 1) % SESSION_CYCLE.length;
  return SESSION_CYCLE[index] ?? BRAND_PHOTOS.shoulders;
}

export function trainingCover(slug: string, pack: PhotoPack = "default"): string {
  if (pack === "il") {
    if (slug === "anger") return IL_PHOTOS.desert;
    if (slug === "reentry") return IL_PHOTOS.hills;
    return IL_PHOTOS.grove;
  }
  if (slug === "fundamentals") return BRAND_PHOTOS.running;
  return "";
}

export function profileCover(pack: PhotoPack = "default"): string {
  return pack === "il" ? IL_PHOTOS.hills : BRAND_PHOTOS.profile;
}

export function coverObjectClass(src: string): string {
  switch (src) {
    case BRAND_PHOTOS.shoulders:
      return "object-[center_22%]";
    case BRAND_PHOTOS.teen:
      return "object-[center_28%]";
    case BRAND_PHOTOS.park:
      return "object-[center_30%]";
    case BRAND_PHOTOS.bike:
      return "object-[center_32%]";
    default:
      return "object-center";
  }
}
