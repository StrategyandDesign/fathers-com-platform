export const MAX_FILM_SECONDS = 360;

export const FILM_RUNTIME_MISSING = "Runtime missing";

export const FILM_DURATION_FORMAT_ERROR =
  "Enter runtime in whole seconds or m:ss.";

export const FILM_CEILING_CLOCK = "6:00";

export function formatFilmClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function filmOverageMessage(seconds: number) {
  return `Film runs ${formatFilmClock(seconds)}. The ceiling is ${FILM_CEILING_CLOCK}. Re-cut before publishing.`;
}

export function filmRuntimeMinutes(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.ceil(seconds / 60);
}

export function parseDurationInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const value = Number.parseInt(trimmed, 10);
    return Number.isFinite(value) ? value : "invalid";
  }
  const clock = trimmed.match(/^(\d+):([0-5]\d)$/);
  if (!clock) return "invalid";
  const minutes = Number.parseInt(clock[1], 10);
  const seconds = Number.parseInt(clock[2], 10);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return "invalid";
  return minutes * 60 + seconds;
}

export function parseIso8601Duration(value: string) {
  const match = value
    .trim()
    .match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!match) return null;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  if (![days, hours, minutes, seconds].every((part) => Number.isFinite(part))) {
    return null;
  }
  return Math.round(days * 86_400 + hours * 3_600 + minutes * 60 + seconds);
}

export function sessionHasFilm(session: { video_url?: string | null }) {
  return Boolean(session.video_url?.trim());
}

export function isOverLengthFilm(seconds: number | null | undefined) {
  return seconds != null && seconds > MAX_FILM_SECONDS;
}

export function firstFilmPublishError(
  sessions: Array<{ duration_seconds?: number | null; video_url?: string | null }>
) {
  const over = sessions.find((session) => isOverLengthFilm(session.duration_seconds));
  if (over?.duration_seconds != null) {
    return filmOverageMessage(over.duration_seconds);
  }
  if (sessions.some((session) => session.duration_seconds == null)) {
    return FILM_RUNTIME_MISSING;
  }
  return null;
}

export function canStoreOverLengthDuration(
  nextSeconds: number,
  previousSeconds: number | null | undefined
) {
  if (nextSeconds <= MAX_FILM_SECONDS) return true;
  return previousSeconds == null || previousSeconds > MAX_FILM_SECONDS;
}

export function filmRuntimeErrorMessage(message: string | null | undefined) {
  if (!message) return null;
  const overage = message.match(
    /Film runs \d+:\d{2}\. The ceiling is 6:00\. Re-cut before publishing\./
  );
  if (overage) return overage[0];
  if (message.includes(FILM_RUNTIME_MISSING)) return FILM_RUNTIME_MISSING;
  return null;
}

export type SessionFilmFlag = {
  sessionNumber: number;
  title: string;
  missing: boolean;
  overage: string | null;
};

export function sessionFilmFlag(
  session: {
    session_number: number;
    title: string;
    duration_seconds?: number | null;
  }
): SessionFilmFlag {
  return {
    sessionNumber: session.session_number,
    title: session.title,
    missing: session.duration_seconds == null,
    overage: isOverLengthFilm(session.duration_seconds)
      ? filmOverageMessage(session.duration_seconds as number)
      : null,
  };
}

export function trainingFilmFlags(
  sessions: Array<{
    session_number: number;
    title: string;
    duration_seconds?: number | null;
  }>
) {
  const flags = sessions.map(sessionFilmFlag);
  return {
    missing: flags.some((flag) => flag.missing),
    overages: flags.filter((flag) => flag.overage),
  };
}
