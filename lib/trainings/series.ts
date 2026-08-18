import { isSessionComplete, type Session, type SessionProgress, type Training } from "@/lib/father/types";

export const MAX_TRAINING_SESSIONS = 6;

export const SESSION_LIMIT_CREATE_ERROR =
  "A training cannot have more than 6 sessions.";
export const SESSION_LIMIT_PUBLISH_ERROR =
  "A training cannot be published with more than 6 sessions.";
export const SESSION_LIMIT_RELEASE_ERROR =
  "A training cannot be released with more than 6 sessions.";

export type SeriesTraining = Pick<
  Training,
  "id" | "slug" | "title" | "series_id" | "series_title" | "part_number" | "part_total" | "session_count"
>;

export function isSeriesTraining(
  training: Pick<Training, "series_id" | "part_number" | "part_total">
) {
  return Boolean(training.series_id && training.part_number && training.part_total);
}

export function isLaterSeriesPart(
  training: Pick<Training, "series_id" | "part_number">
) {
  return Boolean(training.series_id && (training.part_number ?? 0) > 1);
}

export function trainingCoverSlug(
  training: Pick<Training, "slug" | "series_id" | "part_number">
) {
  if (isLaterSeriesPart(training)) {
    const root = training.slug.replace(/-\d+$/, "");
    return root || training.slug;
  }
  return training.slug;
}

export function trainingPartSubtitle(
  training: Pick<Training, "part_number" | "part_total">,
  sessionTotal: number
) {
  if (!training.part_number || !training.part_total) return null;
  const sessions =
    sessionTotal === 1 ? "1 session." : `${sessionTotal} sessions.`;
  return `Part ${training.part_number} of ${training.part_total}. ${sessions}`;
}

export function trainingPartCopyVars(
  training: Pick<Training, "part_number" | "part_total">,
  sessionTotal: number
) {
  if (!training.part_number || !training.part_total) return null;
  return {
    n: training.part_number,
    total: training.part_total,
    sessions: sessionTotal,
    one: sessionTotal === 1,
  };
}

export function previousSeriesParts<T extends Pick<Training, "series_id" | "part_number">>(
  training: T,
  catalog: T[]
) {
  if (!training.series_id || !training.part_number) return [];
  return catalog.filter(
    (row) =>
      row.series_id === training.series_id &&
      (row.part_number ?? 0) > 0 &&
      (row.part_number ?? 0) < training.part_number!
  );
}

export function seriesSiblings<T extends Pick<Training, "id" | "series_id" | "part_number">>(
  training: T,
  catalog: T[]
) {
  if (!training.series_id) return [training];
  return catalog
    .filter((row) => row.series_id === training.series_id)
    .sort((left, right) => (left.part_number ?? 0) - (right.part_number ?? 0));
}

export function isTrainingPartComplete(
  trainingId: string,
  sessions: Session[],
  progressBySession: Map<string, SessionProgress | null | undefined>
) {
  const partSessions = sessions.filter((session) => session.training_id === trainingId);
  if (partSessions.length === 0) return false;
  return partSessions.every((session) =>
    isSessionComplete(progressBySession.get(session.id) ?? null)
  );
}

export function isSeriesPartGated(
  training: Pick<Training, "id" | "series_id" | "part_number">,
  catalog: Array<Pick<Training, "id" | "series_id" | "part_number">>,
  sessions: Session[],
  progressBySession: Map<string, SessionProgress | null | undefined>
) {
  if (!isLaterSeriesPart(training)) return false;
  return previousSeriesParts(training, catalog).some(
    (part) => !isTrainingPartComplete(part.id, sessions, progressBySession)
  );
}

export function gatedPartLabel(training: Pick<Training, "part_number">) {
  const prior = (training.part_number ?? 1) - 1;
  return prior > 0 ? prior : 1;
}

export function sessionCountWouldExceedLimit(currentCount: number, adding = 1) {
  return currentCount + adding > MAX_TRAINING_SESSIONS;
}
