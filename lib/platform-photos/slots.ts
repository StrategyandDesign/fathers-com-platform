import { BRAND_PHOTOS } from "@/lib/brand/photos";

export const LOGIN_BACKGROUND_SLOT = "login_background" as const;
export const LOGIN_BACKGROUND_OBJECT_PATH = LOGIN_BACKGROUND_SLOT;
export const DEFAULT_LOGIN_BACKGROUND = BRAND_PHOTOS.woods;

export function isLoginBackgroundSlot(value: string): value is typeof LOGIN_BACKGROUND_SLOT {
  return value === LOGIN_BACKGROUND_SLOT;
}
