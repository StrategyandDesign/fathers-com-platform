export type Training = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  session_count: number;
  order_index: number;
  published?: boolean | null;
};

export function isTrainingPublished(training: { published?: boolean | null }) {
  return training.published !== false;
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
  status: "not_started" | "in_progress" | "completed";
  completed_at: string | null;
};

export type FatherProfileSummary = {
  id: string;
  taken_at: string;
  primary_edge: string | null;
  primary_determination?: string | null;
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

export function continueHref(
  sessionId: string,
  progress: Pick<
    SessionProgress,
    "film_completed" | "checkin_completed" | "action_completed"
  > | null
) {
  if (!progress?.film_completed) return `/father/sessions/${sessionId}`;
  if (!progress.checkin_completed) {
    return `/father/sessions/${sessionId}/checkin`;
  }
  if (!progress.action_completed) {
    return `/father/sessions/${sessionId}/action`;
  }
  return `/father/sessions/${sessionId}`;
}

export function youtubeEmbedUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) {
      return `https://www.youtube.com/embed/${fromQuery}`;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
