import { normalizeCohortNote } from "@/lib/cohort-note/types";

export type CohortNoteSegment =
  | { type: "text"; value: string }
  | { type: "link"; href: string; value: string };

const URL_FINDER = /\b((?:https?:\/\/|www\.)[^\s]+)/gi;

function splitUrlAndTrail(raw: string) {
  let url = raw;
  let trail = "";
  while (url.length > 0) {
    const last = url[url.length - 1] ?? "";
    if (/[.,!?;:]/.test(last)) {
      trail = last + trail;
      url = url.slice(0, -1);
      continue;
    }
    if (last === ")" && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
      trail = last + trail;
      url = url.slice(0, -1);
      continue;
    }
    if (last === "'" || last === '"' || last === "”" || last === "’") {
      trail = last + trail;
      url = url.slice(0, -1);
      continue;
    }
    break;
  }
  return { url, trail };
}

export function safeCohortNoteHref(raw: string) {
  const { url } = splitUrlAndTrail(raw.trim());
  if (!url) return null;
  const candidate = url.startsWith("www.") ? `https://${url}` : url;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function cohortNoteSegments(body: string): CohortNoteSegment[] {
  const text = normalizeCohortNote(body);
  if (!text) return [];

  const segments: CohortNoteSegment[] = [];
  const finder = new RegExp(URL_FINDER.source, URL_FINDER.flags);
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = finder.exec(text))) {
    const start = match.index;
    const raw = match[1] ?? "";
    if (start > last) {
      segments.push({ type: "text", value: text.slice(last, start) });
    }
    const { url, trail } = splitUrlAndTrail(raw);
    const href = safeCohortNoteHref(url);
    if (href && url) {
      segments.push({ type: "link", href, value: url });
      if (trail) segments.push({ type: "text", value: trail });
    } else {
      segments.push({ type: "text", value: raw });
    }
    last = start + raw.length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return mergeTextSegments(segments);
}

function mergeTextSegments(segments: CohortNoteSegment[]) {
  const merged: CohortNoteSegment[] = [];
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (segment.type === "text" && previous?.type === "text") {
      previous.value += segment.value;
      continue;
    }
    merged.push({ ...segment });
  }
  return merged;
}
