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
  progress: SessionProgress | null | undefined,
  sessionDots?: Array<{ id?: string; done?: boolean }> | null
) {
  if ((completed ?? 0) > 0) return true;
  if (sessionDots?.some((dot) => Boolean(dot.done))) return true;
  if (!progress) return false;
  return (
    isSessionComplete(progress) ||
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}

function shouldOpenOverview(
  training: Pick<Training, "overview_video_url">,
  completed?: number | null,
  progress?: SessionProgress | null,
  sessionDots?: Array<{ id?: string; done?: boolean }> | null
) {
  return (
    hasTrainingOverview(training) &&
    !hasStartedTrainingWork(completed, progress, sessionDots)
  );
}

/** First session film. Used after the training is complete so a father can watch again. */
export function reviewSessionHref(
  sessionDots?: Array<{ id?: string; done?: boolean }> | null
) {
  const first = (sessionDots ?? []).find((dot) => Boolean(dot.id));
  return first?.id ? sessionFilmPath(first.id) : null;
}

/** Catalog card: overview only before the first session is started. */
export function shouldShowCatalogOverview(input: {
  enabled?: boolean;
  gated?: boolean;
  completed?: number | null;
  progress?: SessionProgress | null;
  sessionDots?: Array<{ id?: string; done?: boolean }> | null;
}) {
  return (
    Boolean(input.enabled) &&
    !input.gated &&
    !hasStartedTrainingWork(input.completed, input.progress, input.sessionDots)
  );
}

export function trainingDoorHref(input: {
  training: Pick<Training, "id" | "overview_video_url">;
  next?: Session | null;
  nextProgress?: SessionProgress | null;
  completed?: number | null;
  sessionDots?: Array<{ id?: string; done?: boolean }> | null;
}) {
  if (shouldOpenOverview(input.training, input.completed, input.nextProgress, input.sessionDots)) {
    return trainingOverviewPath(input.training.id);
  }
  if (input.next) {
    return sessionFilmPath(input.next.id);
  }
  return reviewSessionHref(input.sessionDots) ?? "/father/trainings";
}

/** Home Start / onboarding: overview first, then the open session. */
export function trainingContinueHref(input: {
  training: Pick<Training, "id" | "overview_video_url">;
  next?: Session | null;
  nextProgress?: SessionProgress | null;
  completed?: number | null;
  sessionDots?: Array<{ id?: string; done?: boolean }> | null;
}) {
  if (shouldOpenOverview(input.training, input.completed, input.nextProgress, input.sessionDots)) {
    return trainingOverviewPath(input.training.id);
  }
  if (input.next) {
    return continueHref(input.next.id, input.nextProgress ?? null);
  }
  return reviewSessionHref(input.sessionDots) ?? "/father/trainings";
}
