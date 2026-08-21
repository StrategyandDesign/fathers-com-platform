export type Training = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  leader_summary?: string | null;
  session_count: number;
  order_index: number;
  published?: boolean | null;
  released_at?: string | null;
  released_by?: string | null;
  first_published_at?: string | null;
  first_released_at?: string | null;
  development_status?: string | null;
  working_title?: string | null;
  development_notes?: string | null;
  last_edited_at?: string | null;
  last_edited_by?: string | null;
  previewed_at?: string | null;
  attribution?: string | null;
  overview_video_url?: string | null;
};

export function trainingOverviewPath(trainingId: string) {
  return `/father/trainings/${trainingId}`;
}

export function isTrainingPublished(training: { published?: boolean | null }) {
  return training.published !== false;
}

export function isLegacyCatalogTraining(training: {
  released_at?: string | null;
  first_published_at?: string | null;
  first_released_at?: string | null;
}) {
  return (
    !training.released_at &&
    !training.first_released_at &&
    Boolean(training.first_published_at)
  );
}

export function isTrainingAssignable(
  training: {
    published?: boolean | null;
    released_at?: string | null;
    first_published_at?: string | null;
    first_released_at?: string | null;
  },
  reviewStatus: string | null | undefined
) {
  if (!isTrainingPublished(training)) return false;
  if (training.released_at) return reviewStatus === "accepted";
  return isLegacyCatalogTraining(training) && reviewStatus !== "declined";
}

export function isTrainingVisibleInCatalog(
  training: {
    published?: boolean | null;
    released_at?: string | null;
    first_published_at?: string | null;
    first_released_at?: string | null;
  },
  access: {
    accepted: boolean;
    assigned: boolean;
    hasProgress: boolean;
    hasCertificate: boolean;
    declined?: boolean;
  }
) {
  if (access.assigned || access.hasProgress || access.hasCertificate) return true;
  if (!isTrainingPublished(training)) return false;
  if (training.released_at) return access.accepted;
  if (access.declined) return false;
  return isLegacyCatalogTraining(training);
}

/** Display denominator only — never used to decide session completion. */
export function catalogSessionTotal(
  training: Pick<Training, "session_count">,
  rowCount: number
) {
  return Math.max(training.session_count ?? 0, rowCount);
}

export type Session = {
  id: string;
  training_id: string;
  session_number: number;
  title: string;
  keyline: string | null;
  video_url: string | null;
  order_index: number;
  duration_seconds?: number | null;
  checkin_prompt?: string | null;
  action_prompt?: string | null;
};

export type SessionProgress = {
  id: string;
  father_id: string;
  session_id: string;
  film_completed: boolean;
  checkin_completed: boolean;
  action_completed: boolean;
  checkin_answers: Record<string, string>;
  action_note: string | null;
  session_note: string | null;
  film_seconds: number;
  status: "not_started" | "in_progress" | "completed";
  completed_at: string | null;
  action_try_at?: string | null;
  skill_use?: "used" | "later" | "dismissed" | null;
  skill_use_at?: string | null;
};

export function asSessionProgress(row: SessionProgress): SessionProgress {
  const raw = row.checkin_answers;
  const answers =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, string>) }
      : {};
  const fromAnswers = typeof answers.notes === "string" ? answers.notes.trim() : "";
  delete answers.notes;
  const fromColumn = typeof row.session_note === "string" ? row.session_note.trim() : "";

  const filmSeconds =
    typeof row.film_seconds === "number" &&
    Number.isFinite(row.film_seconds) &&
    row.film_seconds >= 0
      ? Math.floor(row.film_seconds)
      : 0;

  return {
    ...row,
    checkin_answers: answers,
    session_note: fromColumn || fromAnswers || null,
    film_seconds: filmSeconds,
    skill_use:
      row.skill_use === "used" || row.skill_use === "later" || row.skill_use === "dismissed"
        ? row.skill_use
        : null,
    skill_use_at: typeof row.skill_use_at === "string" ? row.skill_use_at : null,
  };
}

export type FatherProfileSummary = {
  id: string;
  taken_at: string;
  primary_edge: string | null;
  primary_determination?: string | null;
  raw_scores?: unknown;
  full_results?: unknown;
};

export function isSessionComplete(
  progress: Pick<
    SessionProgress,
    "film_completed" | "checkin_completed" | "action_completed"
  > | null
) {
  return Boolean(
    progress?.film_completed &&
      progress?.checkin_completed &&
      progress?.action_completed
  );
}

export function sessionFilmPath(sessionId: string, options?: { root?: string }) {
  const root = options?.root ?? "/father";
  return `${root}/sessions/${sessionId}`;
}

export function continueHref(
  sessionId: string,
  progress: Pick<
    SessionProgress,
    "film_completed" | "checkin_completed" | "action_completed"
  > | null,
  options?: { root?: string }
) {
  const root = options?.root ?? "/father";
  if (!progress?.film_completed) return sessionFilmPath(sessionId, { root });
  if (!progress.checkin_completed) {
    return `${root}/sessions/${sessionId}/checkin`;
  }
  if (!progress.action_completed) {
    return `${root}/sessions/${sessionId}/action`;
  }
  return `${root}/sessions/${sessionId}`;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);
const YOUTUBE_PATH_MARKERS = new Set(["embed", "shorts", "live", "v", "watch"]);

export function youtubeVideoId(url: string | null | undefined) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (YOUTUBE_ID.test(trimmed)) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const fromQuery = parsed.searchParams.get("v")?.trim() ?? "";
  if (YOUTUBE_ID.test(fromQuery)) return fromQuery;

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = parts[0] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }

  for (let index = 0; index < parts.length - 1; index += 1) {
    if (
      YOUTUBE_PATH_MARKERS.has(parts[index].toLowerCase()) &&
      YOUTUBE_ID.test(parts[index + 1])
    ) {
      return parts[index + 1];
    }
  }

  return null;
}

export function youtubeEmbedUrl(
  url: string | null,
  options?: { startSeconds?: number; origin?: string; language?: string }
) {
  const id = youtubeVideoId(url);
  if (!id) return null;

  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    cc_load_policy: "1",
    enablejsapi: "1",
  });
  const language = options?.language?.trim();
  if (language) {
    params.set("hl", language);
    params.set("cc_lang_pref", language);
  }
  const start = Math.floor(options?.startSeconds ?? 0);
  if (start > 0) params.set("start", String(start));
  if (options?.origin) params.set("origin", options.origin);

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
