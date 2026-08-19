import { hasHostedVideo } from "@/lib/media/hosted-video";
import {
  continueHref,
  isSessionComplete,
  sessionFilmPath,
  trainingOverviewPath,
  type Session,
  type SessionProgress,
  type Training,
} from "@/lib/father/types";

export function hasTrainingOverview(training: Pick<Training, "overview_video_url">) {
  return hasHostedVideo(training.overview_video_url);
}

export function hasStartedTrainingWork(
  completed: number | null | undefined,
  progress: SessionProgress | null | undefined
) {
  if ((completed ?? 0) > 0) return true;
  if (!progress) return false;
  return (
    isSessionComplete(progress) ||
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}

/** Catalog card: overview only before the first session is started. */
export function shouldShowCatalogOverview(input: {
  enabled?: boolean;
  gated?: boolean;
  completed?: number | null;
  progress?: SessionProgress | null;
}) {
  return (
    Boolean(input.enabled) &&
    !input.gated &&
    !hasStartedTrainingWork(input.completed, input.progress)
  );
}

export function trainingDoorHref(input: {
  training: Pick<Training, "id" | "overview_video_url">;
  next?: Session | null;
  nextProgress?: SessionProgress | null;
}) {
  if (hasTrainingOverview(input.training)) {
    return trainingOverviewPath(input.training.id);
  }
  if (input.next) {
    return sessionFilmPath(input.next.id);
  }
  return "/father/trainings";
}

/** Home Start / onboarding: overview first, then the open session. */
export function trainingContinueHref(input: {
  training: Pick<Training, "id" | "overview_video_url">;
  next?: Session | null;
  nextProgress?: SessionProgress | null;
  completed?: number | null;
}) {
  if (
    hasTrainingOverview(input.training) &&
    !hasStartedTrainingWork(input.completed, input.nextProgress)
  ) {
    return trainingOverviewPath(input.training.id);
  }
  if (input.next) {
    return continueHref(input.next.id, input.nextProgress ?? null);
  }
  return "/father/trainings";
}
