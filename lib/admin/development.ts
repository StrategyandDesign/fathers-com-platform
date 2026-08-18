import {
  hasHardcodedSkillPack,
  parseSkillPrompt,
} from "@/lib/father/session-questions";
import { youtubeVideoId, type Session, type Training } from "@/lib/father/types";
import { firstFilmPublishError } from "@/lib/trainings/runtime";
import {
  MAX_TRAINING_SESSIONS,
  SESSION_LIMIT_RELEASE_ERROR,
} from "@/lib/trainings/series";

export const DEVELOPMENT_STATUSES = [
  "draft",
  "in_development",
  "ready_for_review",
  "released",
  "archived",
] as const;

export type DevelopmentStatus = (typeof DEVELOPMENT_STATUSES)[number];

export const AUTHORING_STATUSES = [
  "draft",
  "in_development",
  "ready_for_review",
] as const;

export type AuthoringStatus = (typeof AUTHORING_STATUSES)[number];

export const DEVELOPMENT_STATUS_LABEL: Record<DevelopmentStatus, string> = {
  draft: "Draft",
  in_development: "In Development",
  ready_for_review: "Ready for Review",
  released: "Released",
  archived: "Archived",
};

export const WORKING_TITLE_MAX = 120;
export const DEVELOPMENT_NOTES_MAX = 4000;
export const SKILL_PROMPT_MAX = 2000;

export const ARCHIVE_CONFIRM = "ARCHIVE";

export const ARCHIVE_RELEASE_ERROR =
  "Recover this training from the archive before releasing it to Leaders.";

export const READY_REQUIRED_ERROR =
  "Mark Ready for Review first. Finish the checklist, then release.";

export const ARCHIVED_STATUS_ERROR =
  "Recover this training before changing its development status.";

export const ARCHIVED_PUBLISH_ERROR =
  "Recover this training before publishing it.";

export const PREVIEW_REQUIRED_ERROR =
  "Walk the Stage preview end-to-end before marking Ready.";

export function asDevelopmentStatus(value: unknown): DevelopmentStatus {
  if (
    typeof value === "string" &&
    (DEVELOPMENT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as DevelopmentStatus;
  }
  return "draft";
}

export function isArchivedTraining(training: { development_status?: string | null }) {
  return asDevelopmentStatus(training.development_status) === "archived";
}

export function isAuthoringStatus(value: string): value is AuthoringStatus {
  return (AUTHORING_STATUSES as readonly string[]).includes(value);
}

export function developmentStatusClassName(status: DevelopmentStatus) {
  if (status === "released" || status === "ready_for_review") return "text-primary";
  if (status === "archived") return "text-muted-foreground";
  return "text-foreground";
}

export function composeSkillPrompt(input: {
  stem: string;
  a: string;
  b: string;
  c: string;
}) {
  const stem = input.stem.trim();
  const a = input.a.trim();
  const b = input.b.trim();
  const c = input.c.trim();
  if (!stem && !a && !b && !c) return null;

  const lines = [stem];
  if (a) lines.push(`A) ${a}`);
  if (b) lines.push(`B) ${b}`);
  if (c) lines.push(`C) ${c}`);
  return lines.filter((line) => line.length > 0).join("\n");
}

export function skillPromptFields(text: string | null | undefined) {
  if (!text?.trim()) {
    return { stem: "", a: "", b: "", c: "" };
  }

  const parsed = parseSkillPrompt(text);
  const byLetter = new Map((parsed.choices ?? []).map((choice) => [choice.value, choice.label]));
  return {
    stem: parsed.stem,
    a: byLetter.get("A") ?? "",
    b: byLetter.get("B") ?? "",
    c: byLetter.get("C") ?? "",
  };
}

export function skillPromptIsComplete(text: string | null | undefined) {
  if (!text?.trim()) return false;
  const parsed = parseSkillPrompt(text);
  const labels = (parsed.choices ?? [])
    .map((choice) => choice.label.trim())
    .filter(Boolean);
  return Boolean(parsed.stem.trim()) && labels.length >= 3;
}

export type ReadyChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

export type DevelopmentChecklistInput = Pick<
  Training,
  "title" | "slug" | "description"
> & {
  previewed_at?: string | null;
  sessions: Array<
    Pick<
      Session,
      | "session_number"
      | "title"
      | "video_url"
      | "duration_seconds"
      | "checkin_prompt"
      | "action_prompt"
    > & {
      id?: string;
    }
  >;
};

function sessionHasFilm(
  session: Pick<Session, "video_url">
) {
  return Boolean(youtubeVideoId(session.video_url));
}

export function sessionHasReadyQuestions(
  session: Pick<Session, "session_number" | "title" | "checkin_prompt" | "action_prompt">,
  hasHardcoded: boolean
) {
  const checkinReady = skillPromptIsComplete(session.checkin_prompt) || hasHardcoded;
  const actionReady = skillPromptIsComplete(session.action_prompt) || hasHardcoded;
  return { checkinReady, actionReady };
}

export function trainingDevelopmentChecklist(
  training: DevelopmentChecklistInput,
  options?: { sessionHasHardcoded?: (session: DevelopmentChecklistInput["sessions"][number]) => boolean }
): {
  items: ReadyChecklistItem[];
  ready: boolean;
  firstMissing: string | null;
} {
  const sessions = training.sessions;
  const hasHardcoded =
    options?.sessionHasHardcoded ??
    ((session) => hasHardcodedSkillPack(session, { slug: training.slug }));

  const missingFilm = sessions.find((session) => !sessionHasFilm(session));
  const missingRuntime = sessions.find(
    (session) => session.duration_seconds == null
  );
  const missingCheckin = sessions.find((session) => {
    const { checkinReady } = sessionHasReadyQuestions(session, hasHardcoded(session));
    return !checkinReady;
  });
  const missingAction = sessions.find((session) => {
    const { actionReady } = sessionHasReadyQuestions(session, hasHardcoded(session));
    return !actionReady;
  });

  const items: ReadyChecklistItem[] = [
    {
      key: "identity",
      label: "Title and slug are set",
      done: Boolean(training.title.trim() && training.slug.trim()),
    },
    {
      key: "sessions",
      label: "At least one session",
      done: sessions.length > 0,
    },
    {
      key: "films",
      label: "Every session has a YouTube film",
      done: sessions.length > 0 && !missingFilm,
    },
    {
      key: "runtime",
      label: "Every session has a runtime",
      done: sessions.length > 0 && !missingRuntime,
    },
    {
      key: "checkin",
      label: "Every session has a Check-in with three options",
      done: sessions.length > 0 && !missingCheckin,
    },
    {
      key: "action",
      label: "Every session has an Action with three options",
      done: sessions.length > 0 && !missingAction,
    },
    {
      key: "previewed",
      label: "Stage preview walked end-to-end",
      done: Boolean(training.previewed_at),
    },
  ];

  let firstMissing: string | null = null;
  if (!items[0].done) firstMissing = "Add a title and slug.";
  else if (!items[1].done) firstMissing = "Add at least one session.";
  else if (missingFilm) {
    firstMissing = `Session ${missingFilm.session_number} needs a YouTube film.`;
  } else if (missingRuntime) {
    firstMissing = `Session ${missingRuntime.session_number} needs a runtime.`;
  } else if (missingCheckin) {
    firstMissing = `Session ${missingCheckin.session_number} needs a Check-in question with three options.`;
  } else if (missingAction) {
    firstMissing = `Session ${missingAction.session_number} needs an Action with three options.`;
  } else if (!training.previewed_at) {
    firstMissing = PREVIEW_REQUIRED_ERROR;
  }

  return {
    items,
    ready: items.every((item) => item.done),
    firstMissing,
  };
}

export function firstReadyBlocker(
  training: DevelopmentChecklistInput,
  options?: { sessionHasHardcoded?: (session: DevelopmentChecklistInput["sessions"][number]) => boolean }
) {
  if (training.sessions.length > MAX_TRAINING_SESSIONS) {
    return SESSION_LIMIT_RELEASE_ERROR;
  }
  const filmError = firstFilmPublishError(training.sessions);
  if (filmError) return filmError;
  return trainingDevelopmentChecklist(training, options).firstMissing;
}

export function archiveHasLiveUsage(usage: {
  assignmentCount: number;
  progressCount: number;
  certificateCount: number;
}) {
  return usage.assignmentCount + usage.progressCount + usage.certificateCount > 0;
}

export function formatEditedAt(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
