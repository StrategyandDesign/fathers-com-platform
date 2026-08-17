import type { SupabaseClient } from "@supabase/supabase-js";

export const CERTIFICATES_BUCKET = "certificates";
export const AVATARS_BUCKET = "avatars";
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function avatarObjectPath(userId: string) {
  return `${userId}/avatar`;
}

export function certificateObjectPath(fatherId: string, serial: string) {
  return `${fatherId}/${serial}.pdf`;
}

export async function signStorageUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string | null | undefined,
  expiresIn = SIGNED_URL_TTL_SECONDS
) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function signStorageUrls(
  supabase: SupabaseClient,
  bucket: string,
  paths: Array<string | null | undefined>,
  expiresIn = SIGNED_URL_TTL_SECONDS
) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
  if (error || !data) return map;

  unique.forEach((path, index) => {
    const row = data[index];
    const url = row?.signedUrl ?? row?.signedURL;
    if (url && !row.error) {
      map.set(path, url);
      if (row.path) map.set(row.path, url);
    }
  });
  return map;
}
