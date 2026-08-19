import { readFileSync } from "node:fs";
import path from "node:path";

export type SharedRevision = {
  patch: number;
  revision: string;
  label: string;
  at: string;
  title: string;
};

export type SharedMark = {
  mark: number;
  patch: number;
  label: string;
  tag: string;
  at: string;
  internalSha: string;
  sharedSha: string;
  title: string;
  url: string;
  revisions: SharedRevision[];
};

export function formatSharedRevision(mark: number, patch: number) {
  if (!Number.isInteger(patch) || patch < 1) return "";
  return `${mark}.${String(patch).padStart(2, "0")}`;
}

export function formatSharedLabel(mark: number, patch: number) {
  const revision = formatSharedRevision(mark, patch);
  return revision ? `Shared ${mark}-${revision}` : `Shared ${mark}`;
}

function parseRevisions(value: unknown): SharedRevision[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const patch = Number(item.patch);
    if (!Number.isInteger(patch) || patch < 1) return [];
    return [
      {
        patch,
        revision: typeof item.revision === "string" ? item.revision : formatSharedRevision(1, patch),
        label: typeof item.label === "string" ? item.label : "",
        at: typeof item.at === "string" ? item.at : "",
        title: typeof item.title === "string" ? item.title : "",
      },
    ];
  });
}

export function parseSharedMark(source: string): SharedMark | null {
  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const mark = Number(parsed.mark);
    if (!Number.isInteger(mark) || mark < 1) return null;
    const patch = Number(parsed.patch);
    const safePatch = Number.isInteger(patch) && patch > 0 ? patch : 0;
    return {
      mark,
      patch: safePatch,
      label:
        typeof parsed.label === "string" && parsed.label
          ? parsed.label
          : formatSharedLabel(mark, safePatch),
      tag: typeof parsed.tag === "string" ? parsed.tag : `shared/${mark}`,
      at: typeof parsed.at === "string" ? parsed.at : "",
      internalSha: typeof parsed.internalSha === "string" ? parsed.internalSha : "",
      sharedSha: typeof parsed.sharedSha === "string" ? parsed.sharedSha : "",
      title: typeof parsed.title === "string" ? parsed.title : "",
      url:
        typeof parsed.url === "string"
          ? parsed.url
          : `https://github.com/StrategyandDesign/fathers-com-clean-pilot/releases/tag/shared/${mark}`,
      revisions: parseRevisions(parsed.revisions),
    };
  } catch {
    return null;
  }
}

export function loadSharedMark(root = process.cwd()): SharedMark | null {
  try {
    return parseSharedMark(readFileSync(path.join(root, "shared-mark.json"), "utf8"));
  } catch {
    return null;
  }
}
