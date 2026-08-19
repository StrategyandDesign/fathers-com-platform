import { readFileSync } from "node:fs";
import path from "node:path";

export type SharedMark = {
  mark: number;
  tag: string;
  at: string;
  internalSha: string;
  sharedSha: string;
  title: string;
  url: string;
};

export function parseSharedMark(source: string): SharedMark | null {
  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const mark = Number(parsed.mark);
    if (!Number.isInteger(mark) || mark < 1) return null;
    return {
      mark,
      tag: typeof parsed.tag === "string" ? parsed.tag : `shared/${mark}`,
      at: typeof parsed.at === "string" ? parsed.at : "",
      internalSha: typeof parsed.internalSha === "string" ? parsed.internalSha : "",
      sharedSha: typeof parsed.sharedSha === "string" ? parsed.sharedSha : "",
      title: typeof parsed.title === "string" ? parsed.title : "",
      url:
        typeof parsed.url === "string"
          ? parsed.url
          : `https://github.com/StrategyandDesign/fathers-com-clean-pilot/releases/tag/shared/${mark}`,
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
