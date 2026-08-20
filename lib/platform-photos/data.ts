import {
  DEFAULT_LOGIN_BACKGROUND,
  LOGIN_BACKGROUND_SLOT,
} from "@/lib/platform-photos/slots";
import { PLATFORM_PHOTOS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type LoginBackground = {
  url: string;
  isCustom: boolean;
  updatedAt: string | null;
};

const defaultBackground: LoginBackground = {
  url: DEFAULT_LOGIN_BACKGROUND,
  isCustom: false,
  updatedAt: null,
};

function missingPlatformPhotos(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /platform_photos/i.test(error.message ?? "")
  );
}

export async function loadLoginBackground(): Promise<LoginBackground> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_photos")
      .select("storage_path, updated_at")
      .eq("slot", LOGIN_BACKGROUND_SLOT)
      .maybeSingle();

    if (error) {
      if (missingPlatformPhotos(error)) return defaultBackground;
      return defaultBackground;
    }
    if (!data?.storage_path) return defaultBackground;

    const { data: published } = supabase.storage
      .from(PLATFORM_PHOTOS_BUCKET)
      .getPublicUrl(data.storage_path);
    if (!published?.publicUrl) return defaultBackground;

    const stamp = data.updated_at ? `v=${encodeURIComponent(data.updated_at)}` : "";
    return {
      url: stamp ? `${published.publicUrl}?${stamp}` : published.publicUrl,
      isCustom: true,
      updatedAt: data.updated_at ?? null,
    };
  } catch {
    return defaultBackground;
  }
}
