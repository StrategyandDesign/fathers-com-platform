import { youtubeEmbedUrl, youtubeVideoId } from "@/lib/father/types";

const VIMEO_ID = /^\d{6,12}$/;
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export type HostedVideoKind = "youtube" | "vimeo";

export type HostedVideo = {
  kind: HostedVideoKind;
  id: string;
  hash?: string;
};

function parseUrl(raw: string) {
  try {
    return new URL(/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

export function vimeoVideoRef(url: string | null | undefined): HostedVideo | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (VIMEO_ID.test(trimmed)) return { kind: "vimeo", id: trimmed };

  const parsed = parseUrl(trimmed);
  if (!parsed) return null;
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!VIMEO_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  let id = "";
  let hash: string | undefined;

  if (parsed.hostname.toLowerCase().includes("player.vimeo.com")) {
    const videoIndex = parts.findIndex((part) => part.toLowerCase() === "video");
    id = videoIndex >= 0 ? (parts[videoIndex + 1] ?? "") : (parts[0] ?? "");
    const fromQuery = parsed.searchParams.get("h")?.trim();
    if (fromQuery) hash = fromQuery;
  } else {
    const videosIndex = parts.findIndex((part) => part.toLowerCase() === "videos");
    if (videosIndex >= 0) {
      id = parts[videosIndex + 1] ?? "";
    } else {
      id = parts.find((part) => VIMEO_ID.test(part)) ?? parts[0] ?? "";
    }
    const next = parts[parts.indexOf(id) + 1];
    if (next && /^[a-zA-Z0-9]+$/.test(next) && !VIMEO_ID.test(next)) {
      hash = next;
    }
  }

  if (!VIMEO_ID.test(id)) return null;
  return hash ? { kind: "vimeo", id, hash } : { kind: "vimeo", id };
}

export function parseHostedVideo(url: string | null | undefined): HostedVideo | null {
  const youtubeId = youtubeVideoId(url);
  if (youtubeId) return { kind: "youtube", id: youtubeId };
  return vimeoVideoRef(url);
}

export function hostedVideoEmbed(
  url: string | null | undefined,
  options?: { language?: string }
) {
  const parsed = parseHostedVideo(url);
  if (!parsed) return null;
  if (parsed.kind === "youtube") {
    return youtubeEmbedUrl(url ?? parsed.id, options);
  }

  const params = new URLSearchParams({ dnt: "1" });
  if (parsed.hash) params.set("h", parsed.hash);
  return `https://player.vimeo.com/video/${parsed.id}?${params.toString()}`;
}

export function hasHostedVideo(url: string | null | undefined) {
  return Boolean(parseHostedVideo(url));
}
