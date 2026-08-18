import "server-only";

import { parseIso8601Duration } from "@/lib/trainings/runtime";

const FETCH_TIMEOUT_MS = 4_000;

function youtubeApiKey() {
  return process.env.YOUTUBE_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
}

export function hasYoutubeDurationKey() {
  return Boolean(youtubeApiKey());
}

export async function fetchYoutubeDurationSeconds(videoId: string) {
  const key = youtubeApiKey();
  if (!key || !videoId) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      items?: Array<{ contentDetails?: { duration?: string } }>;
    };
    const iso = payload.items?.[0]?.contentDetails?.duration;
    if (!iso) return null;
    return parseIso8601Duration(iso);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
