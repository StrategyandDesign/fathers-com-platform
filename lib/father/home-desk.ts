export const HOME_DESK_COOKIE = "fc_home_desk";

/** Long enough that a trip to Trainings and back does not count as coming back. */
export const SKILL_USE_HOME_AWAY_MS = 12 * 60 * 60 * 1000;

export type HomeDeskVisit = {
  loginAt: string;
  seenAt: string;
};

export function parseHomeDeskVisit(value: unknown): HomeDeskVisit | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const parsed = parseJson(raw) ?? parseJson(safeDecode(raw));
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  const loginAt = typeof row.loginAt === "string" ? row.loginAt : "";
  const seenAt = typeof row.seenAt === "string" ? row.seenAt : "";
  if (!loginAt && !seenAt) return null;
  return { loginAt, seenAt };
}

export function encodeHomeDeskVisit(visit: HomeDeskVisit) {
  return encodeURIComponent(JSON.stringify(visit));
}

export function homeDeskCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}

export function clientHomeDeskCookie(visit: HomeDeskVisit) {
  const options = homeDeskCookieOptions();
  return `${HOME_DESK_COOKIE}=${encodeHomeDeskVisit(visit)}; Path=${options.path}; Max-Age=${options.maxAge}; SameSite=Lax`;
}

/** First home after this login, or a long stretch away from the dashboard. */
export function shouldOfferSkillUseOnHome(
  visit: HomeDeskVisit | null,
  loginAt: string | null | undefined,
  now: Date = new Date(),
  awayMs: number = SKILL_USE_HOME_AWAY_MS
) {
  const login = loginAt?.trim() ?? "";
  const firstLogin = !visit?.loginAt || visit.loginAt !== login;
  const seen = Date.parse(visit?.seenAt ?? "");
  const away = !Number.isFinite(seen) || now.getTime() - seen >= awayMs;
  return firstLogin || away;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
