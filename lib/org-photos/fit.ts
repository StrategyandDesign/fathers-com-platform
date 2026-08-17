import type { OrgPhotoKind } from "@/lib/org-photos/slots";

export const ORG_PHOTO_OUTPUT = {
  home_hero: { width: 1200, height: 400 },
  home_profile: { width: 900, height: 1200 },
  training: { width: 1600, height: 900 },
} as const;

export function orgPhotoOutput(kind: OrgPhotoKind) {
  return ORG_PHOTO_OUTPUT[kind];
}

export function centerCropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number
) {
  const sourceAspect = sourceWidth / sourceHeight;
  if (sourceAspect > targetAspect) {
    const width = sourceHeight * targetAspect;
    return {
      sx: (sourceWidth - width) / 2,
      sy: 0,
      sw: width,
      sh: sourceHeight,
    };
  }
  const height = sourceWidth / targetAspect;
  return {
    sx: 0,
    sy: (sourceHeight - height) / 2,
    sw: sourceWidth,
    sh: height,
  };
}
