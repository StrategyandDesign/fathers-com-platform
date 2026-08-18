import { notFound } from "next/navigation";

import { loadAdminTraining } from "@/lib/admin/data";
import type { AdminTrainingRow } from "@/lib/admin/types";
import { requireRole } from "@/lib/auth/session";
import {
  checkinQuestionsFor,
  parseSkillPrompt,
  sessionAction,
} from "@/lib/father/session-questions";
import {
  catalogSessionTotal,
  youtubeEmbedUrl,
  type Session,
  type Training,
} from "@/lib/father/types";

export type StageStep = "film" | "checkin" | "action";

export type StagePaths = {
  hub: string;
  edit: string;
  session: (sessionId: string) => string;
  checkin: (sessionId: string) => string;
  action: (sessionId: string) => string;
};

export type StageSessionReadiness = {
  session: Session;
  hasVideo: boolean;
  hasKeyline: boolean;
  checkinStem: string;
  actionStem: string;
};

export function stagePaths(trainingId: string): StagePaths {
  const hub = `/admin/trainings/${trainingId}/stage`;
  return {
    hub,
    edit: `/admin/trainings/${trainingId}`,
    session: (sessionId) => `${hub}/sessions/${sessionId}`,
    checkin: (sessionId) => `${hub}/sessions/${sessionId}/checkin`,
    action: (sessionId) => `${hub}/sessions/${sessionId}/action`,
  };
}

export function sessionHasPlayableVideo(session: Pick<Session, "video_url">) {
  return Boolean(youtubeEmbedUrl(session.video_url));
}

export function isVideoTraining(sessions: Pick<Session, "video_url">[]) {
  return sessions.some((session) => sessionHasPlayableVideo(session));
}

export function trainingVideoReadiness(sessions: Pick<Session, "video_url">[]) {
  const withVideo = sessions.filter((session) => sessionHasPlayableVideo(session)).length;
  return {
    total: sessions.length,
    withVideo,
    missing: sessions.length - withVideo,
  };
}

export function stageSessionReadiness(
  session: Session,
  training: Pick<Training, "slug">
): StageSessionReadiness {
  const checkin = checkinQuestionsFor(session, training)[0]?.label ?? "";
  const action = sessionAction(session, training);
  return {
    session,
    hasVideo: sessionHasPlayableVideo(session),
    hasKeyline: Boolean(session.keyline?.trim()),
    checkinStem: parseSkillPrompt(checkin).stem,
    actionStem: parseSkillPrompt(action).stem,
  };
}

export function stageCatalogTotal(training: AdminTrainingRow) {
  return catalogSessionTotal(training, training.sessions.length);
}

export function nextStageHrefAfterAction(training: AdminTrainingRow, session: Session) {
  const paths = stagePaths(training.id);
  const index = training.sessions.findIndex((row) => row.id === session.id);
  const following = index >= 0 ? training.sessions[index + 1] : undefined;
  if (following) {
    return paths.session(following.id);
  }
  return `${paths.hub}?walked=${encodeURIComponent(session.id)}`;
}

export async function requireAdminStageTraining(trainingId: string) {
  await requireRole("admin");
  const training = await loadAdminTraining(trainingId);
  if (!training) notFound();
  return training;
}

export async function requireAdminStageSession(trainingId: string, sessionId: string) {
  const training = await requireAdminStageTraining(trainingId);
  const session = training.sessions.find((row) => row.id === sessionId);
  if (!session) notFound();
  return { training, session };
}
