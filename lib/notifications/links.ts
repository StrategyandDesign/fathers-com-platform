import { continueHref, type SessionProgress } from "@/lib/father/types";

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sessionFilmHref(sessionId: string) {
  return `/father/sessions/${sessionId}`;
}

export function sessionActionHref(sessionId: string) {
  return `/father/sessions/${sessionId}/action`;
}

export function sessionContinueHref(sessionId: string, progress?: SessionProgress | null) {
  return continueHref(sessionId, progress ?? null);
}

export function certificatesHref() {
  return "/father/certificates";
}

export function trainingsHref() {
  return "/father/trainings";
}

export function fatherHomeHref() {
  return "/father";
}

export function isFatherDeepLink(pathname: string) {
  if (
    pathname === "/father" ||
    pathname === "/father/certificates" ||
    pathname === "/father/trainings"
  ) {
    return true;
  }
  const session = pathname.match(/^\/father\/sessions\/([^/]+)(?:\/(checkin|action))?$/);
  return Boolean(session && SESSION_ID.test(session[1]));
}

export function normalizeDeepLink(href: string | null | undefined, fallback = trainingsHref()) {
  const raw = String(href ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  const path = raw.split("?")[0] ?? raw;
  if (path === "/father/") return fatherHomeHref();
  return isFatherDeepLink(path) ? path : fallback;
}
