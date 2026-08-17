export const FATHERS_INTRO_SEEN_KEY = "fathers_intro_seen";

export function isFathersIntroSeenValue(value: string | undefined) {
  return value === "1";
}

export function hasFathersIntroSeen() {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(FATHERS_INTRO_SEEN_KEY) === "1") return true;
  } catch {
    // Private mode or blocked storage.
  }
  return document.cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === FATHERS_INTRO_SEEN_KEY && value === "1";
  });
}

export function markFathersIntroSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FATHERS_INTRO_SEEN_KEY, "1");
  } catch {
    // Private mode or blocked storage.
  }
  document.cookie = `${FATHERS_INTRO_SEEN_KEY}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
}
