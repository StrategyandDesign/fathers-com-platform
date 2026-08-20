import type { AppRole } from "@/lib/auth/roles";
import { continueHref } from "@/lib/father/types";
import type { SessionProgress } from "@/lib/father/types";

export const PRACTICE_ROOT = "/manager/practice";

export type WalkPaths = {
  home: string;
  trainings: string;
  session: (sessionId: string) => string;
  checkin: (sessionId: string) => string;
  action: (sessionId: string) => string;
  done: (sessionId: string) => string;
  profileTake: string;
  profilePart: string;
  profileResults: string;
  assessments: string;
  assessment: (assignmentId: string, questionNumber?: number) => string;
};

export const FATHER_WALK: WalkPaths = {
  home: "/father",
  trainings: "/father/trainings",
  session: (sessionId) => `/father/sessions/${sessionId}`,
  checkin: (sessionId) => `/father/sessions/${sessionId}/checkin`,
  action: (sessionId) => `/father/sessions/${sessionId}/action`,
  done: (sessionId) => `/father/sessions/${sessionId}/done`,
  profileTake: "/father/profile/take",
  profilePart: "/father/profile/part",
  profileResults: "/father/profile/results",
  assessments: "/father/assessments",
  assessment: (assignmentId, questionNumber) => {
    if (!questionNumber) return `/father/assessments/${assignmentId}`;
    return `/father/assessments/${assignmentId}?q=${questionNumber}`;
  },
};

export const PRACTICE_WALK: WalkPaths = {
  home: PRACTICE_ROOT,
  trainings: PRACTICE_ROOT,
  session: (sessionId) => `${PRACTICE_ROOT}/sessions/${sessionId}`,
  checkin: (sessionId) => `${PRACTICE_ROOT}/sessions/${sessionId}/checkin`,
  action: (sessionId) => `${PRACTICE_ROOT}/sessions/${sessionId}/action`,
  done: (sessionId) => `${PRACTICE_ROOT}/sessions/${sessionId}/done`,
  profileTake: `${PRACTICE_ROOT}/profile/take`,
  profilePart: `${PRACTICE_ROOT}/profile/part`,
  profileResults: `${PRACTICE_ROOT}/profile/results`,
  assessments: `${PRACTICE_ROOT}#assessments`,
  assessment: (assignmentId, questionNumber) => {
    if (!questionNumber) return `${PRACTICE_ROOT}/assessments/${assignmentId}`;
    return `${PRACTICE_ROOT}/assessments/${assignmentId}?q=${questionNumber}`;
  },
};

export function walkPathsFor(role: AppRole): WalkPaths {
  return role === "manager" ? PRACTICE_WALK : FATHER_WALK;
}

export function practiceContinueHref(
  sessionId: string,
  progress: Pick<
    SessionProgress,
    "film_completed" | "checkin_completed" | "action_completed"
  > | null
) {
  return continueHref(sessionId, progress, { root: PRACTICE_ROOT });
}

export function isLeaderSelfRow(userId: string, managerId: string) {
  return userId === managerId;
}
