import { readImageMeta, validateOrgPhoto, type ImageMeta } from "@/lib/org-photos/image";

export { readImageMeta, type ImageMeta };

export function validateLoginBackground(meta: ImageMeta | null): string | null {
  const basic = validateOrgPhoto(meta);
  if (basic) return basic;
  if (!meta) return basic;
  if (meta.width < 800 || meta.height < 400) {
    return "Use a wider photo. A panoramic landscape works best.";
  }
  return null;
}
