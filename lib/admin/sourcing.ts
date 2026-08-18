import { youtubeVideoId } from "@/lib/father/types";

export const SOURCE_NAME_MAX = 120;
export const SOURCE_CONTACT_MAX = 120;
export const SOURCE_EMAIL_MAX = 200;
export const SOURCE_CHANNEL_MAX = 500;
export const SOURCE_NOTES_MAX = 2000;
export const INTAKE_TITLE_MAX = 200;
export const INTAKE_AUDIENCE_MAX = 200;
export const INTAKE_OUTLINE_MAX = 8000;
export const INTAKE_RIGHTS_NOTES_MAX = 2000;
export const ATTRIBUTION_MAX = 120;
export const OUTLINE_SESSION_MAX = 40;

export const RIGHTS_STATUSES = ["inquiry", "pending", "cleared", "declined"] as const;
export type RightsStatus = (typeof RIGHTS_STATUSES)[number];

export const INTAKE_STATUSES = ["open", "drafting", "released", "archived"] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

export const RIGHTS_STATUS_LABEL: Record<RightsStatus, string> = {
  inquiry: "Inquiry",
  pending: "Waiting on clearance",
  cleared: "Cleared",
  declined: "Declined",
};

export const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  open: "Recorded",
  drafting: "In the sandbox",
  released: "Released",
  archived: "Archived",
};

export const RIGHTS_REQUIRED_ERROR =
  "Record written clearance for this source before releasing the training to Leaders.";

export const RIGHTS_DECLINED_ERROR =
  "This source declined use. Record clearance, or archive the intake. Do not release it.";

export type OutlineSession = {
  title: string;
  videoUrl: string | null;
};

export function isRightsStatus(value: unknown): value is RightsStatus {
  return typeof value === "string" && (RIGHTS_STATUSES as readonly string[]).includes(value);
}

export function isIntakeStatus(value: unknown): value is IntakeStatus {
  return typeof value === "string" && (INTAKE_STATUSES as readonly string[]).includes(value);
}

export function asRightsStatus(value: unknown): RightsStatus {
  return isRightsStatus(value) ? value : "inquiry";
}

export function asIntakeStatus(value: unknown): IntakeStatus {
  return isIntakeStatus(value) ? value : "open";
}

export function rightsStatusClassName(status: RightsStatus) {
  if (status === "cleared") return "text-primary";
  if (status === "declined") return "text-muted-foreground";
  return "text-foreground";
}

export function sourcedReleaseBlocker(
  intake: { rights_status?: string | null; rightsStatus?: string | null } | null
) {
  if (!intake) return null;
  const rights = asRightsStatus(intake.rights_status ?? intake.rightsStatus);
  if (rights === "cleared") return null;
  if (rights === "declined") return RIGHTS_DECLINED_ERROR;
  return RIGHTS_REQUIRED_ERROR;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value) || /^youtu\.be\//i.test(value);
}

function extractUrl(line: string) {
  const match = line.match(/https?:\/\/\S+/i) ?? line.match(/youtu\.be\/\S+/i);
  return match?.[0]?.replace(/[),.;]+$/, "") ?? null;
}

function stripLeadingIndex(title: string) {
  return title
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^session\s+\d+[:.)-]?\s+/i, "")
    .trim();
}

export function splitOutlineLine(line: string): OutlineSession {
  const raw = line.trim();
  const found = extractUrl(raw);
  const videoId = found ? youtubeVideoId(found) : youtubeVideoId(raw);
  const videoUrl = videoId
    ? found && youtubeVideoId(found)
      ? found
      : raw
    : null;

  let title = raw;
  if (found && videoUrl) {
    title = raw.replace(found, "");
  } else if (videoUrl && !found) {
    title = "";
  }

  title = title.replace(/[\s|—–-]+$/g, "").replace(/^[\s|—–-]+/g, "").trim();
  title = stripLeadingIndex(title);

  if (!title && looksLikeUrl(raw) && !videoUrl) {
    return { title: raw, videoUrl: null };
  }

  return { title, videoUrl };
}

export function parseSessionOutline(text: string): OutlineSession[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const sessions: OutlineSession[] = [];
  for (const line of lines) {
    const parsed = splitOutlineLine(line);
    if (!parsed.title && parsed.videoUrl) {
      const previous = sessions[sessions.length - 1];
      if (previous && !previous.videoUrl) {
        previous.videoUrl = parsed.videoUrl;
        continue;
      }
      sessions.push({
        title: `Session ${sessions.length + 1}`,
        videoUrl: parsed.videoUrl,
      });
      continue;
    }
    if (parsed.title) {
      sessions.push({
        title: parsed.title.slice(0, 200),
        videoUrl: parsed.videoUrl,
      });
    }
  }

  return sessions.slice(0, OUTLINE_SESSION_MAX);
}

export function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSimpleEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
