export const LOGIN_BACKGROUND_SLOT = "login_background" as const;
export const LOGIN_BACKGROUND_OBJECT_PATH = LOGIN_BACKGROUND_SLOT;

export function isLoginBackgroundSlot(value: string): value is typeof LOGIN_BACKGROUND_SLOT {
  return value === LOGIN_BACKGROUND_SLOT;
}
