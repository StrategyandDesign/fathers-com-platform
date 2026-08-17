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

export function sessionCover(sessionNumber: number): string {
  const mapped = SESSION_COVERS[sessionNumber];
  if (mapped) return mapped;
  const index = Math.abs(Math.trunc(sessionNumber) - 1) % SESSION_CYCLE.length;
  return SESSION_CYCLE[index] ?? BRAND_PHOTOS.shoulders;
}

export function trainingCover(slug: string): string {
  if (slug === "fundamentals") return BRAND_PHOTOS.running;
  return "";
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
