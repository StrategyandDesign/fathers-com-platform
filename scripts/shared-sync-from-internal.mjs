import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const SOURCE_FILE = "shared-source.json";
const SHARED_BRANCH = "review";
const SHARED_LEDGER = "SHARED.md";
const SHARED_MARK_FILE = "shared-mark.json";
const SHARED_TAG_PREFIX = "shared/";
const PRESERVE_PATHS = [
  "lib/i18n/messages/he.ts",
  "lib/i18n/messages/he-overlay.ts",
  "lib/i18n/messages/types.ts",
  "lib/i18n/translate.ts",
];

function run(cmd, args, cwd = ROOT) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8" });
}

function requireRun(cmd, args, cwd = ROOT) {
  const result = run(cmd, args, cwd);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `${cmd} ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function log(message) {
  console.log(`[shared-sync ${new Date().toISOString()}] ${message}`);
}

function nextSharedMark(tags) {
  let max = 0;
  for (const tag of tags) {
    const match = String(tag).trim().match(/^shared\/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function parseSharedLedger(markdown) {
  const rows = [];
  for (const line of String(markdown ?? "").split("\n")) {
    const match = line.match(
      /^\|\s*\*\*(\d+)\*\*\s*\|\s*([^|]+)\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|$/
    );
    if (!match) continue;
    rows.push({
      mark: Number(match[1]),
      date: match[2].trim(),
      tag: match[3].trim(),
      internalSha: match[4].trim(),
      title: match[5].trim(),
    });
  }
  return rows;
}

function renderSharedLedger(rows, mark = {}) {
  const lines = [
    "# Shared marks",
    "",
    "Numbered pushes on the review copy Micah and Eric share:",
    "",
    "https://github.com/StrategyandDesign/fathers-com-clean-pilot",
    "",
    "These marks move `review`. They are not official Submit stamps.",
    "Submit 2 stays frozen on `submit/2`. The next official submit is still 4.",
    "",
    "| Mark | Date (UTC) | Tag | Internal SHA | What landed |",
    "|---|---|---|---|---|",
  ];
  for (const row of rows) {
    lines.push(
      `| **${row.mark}** | ${row.date} | \`${row.tag}\` | \`${String(row.internalSha).slice(0, 7)}\` | ${row.title} |`
    );
  }
  lines.push("");
  const revisions = mark.revisions ?? [];
  if (!revisions.length) return lines.join("\n");
  const current = revisions[revisions.length - 1];
  lines.push(
    "## Desk revisions",
    "",
    `The badge on this checkout is **${current.label || `Shared ${current.revision}`}**. It ticks on each push of the Shared 1 desk. This does not create Shared 2. Submit 2 stays frozen.`,
    "",
    "| Revision | Date (UTC) | What landed |",
    "|---|---|---|",
  );
  for (const row of revisions) {
    lines.push(`| **${row.revision}** | ${row.date || row.at} | ${row.title} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function writeMark(dir, mark, existingMarkdown) {
  const byMark = new Map(parseSharedLedger(existingMarkdown).map((row) => [row.mark, row]));
  byMark.set(mark.mark, {
    mark: mark.mark,
    date: mark.at.slice(0, 10),
    tag: mark.tag,
    internalSha: mark.internalSha,
    title: mark.title,
  });
  const rows = [...byMark.values()].sort((a, b) => a.mark - b.mark);
  writeFileSync(path.join(dir, SHARED_LEDGER), renderSharedLedger(rows, mark));
  writeFileSync(path.join(dir, SHARED_MARK_FILE), `${JSON.stringify(mark, null, 2)}\n`);
}

export async function syncFromInternal() {
  const source = JSON.parse(readFileSync(path.join(ROOT, SOURCE_FILE), "utf8"));
  if (!source.repo || !source.branch) throw new Error("shared-source.json needs repo and branch.");
  const cloneDir = path.join(os.tmpdir(), "fathers-shared-internal");
  rmSync(cloneDir, { recursive: true, force: true });
  requireRun("git", [
    "clone",
    "--depth",
    "1",
    "--branch",
    source.branch,
    `https://github.com/${source.repo}.git`,
    cloneDir,
  ]);
  const internalSha = requireRun("git", ["rev-parse", "HEAD"], cloneDir);
  const title = requireRun("git", ["log", "-1", "--format=%s"], cloneDir).replace(/^Shared \d+\.\s*/, "");

  const currentMark = existsSync(path.join(ROOT, SHARED_MARK_FILE))
    ? JSON.parse(readFileSync(path.join(ROOT, SHARED_MARK_FILE), "utf8"))
    : null;
  if (currentMark?.internalSha && String(currentMark.internalSha).startsWith(internalSha.slice(0, 7))) {
    log(`already at Shared ${currentMark.mark} for ${internalSha.slice(0, 7)}`);
    return { ok: true, skipped: true, reason: "already-published" };
  }

  const archivePath = path.join(os.tmpdir(), `fathers-shared-${internalSha.slice(0, 12)}.tar`);
  requireRun("git", ["archive", "--format=tar", "-o", archivePath, "HEAD"], cloneDir);
  requireRun("tar", ["-xf", archivePath], ROOT);
  rmSync(archivePath, { force: true });
  for (const file of PRESERVE_PATHS) {
    const restore = run("git", ["checkout", "HEAD", "--", file], ROOT);
    if (restore.status !== 0) log(`kept missing isolated file ${file}`);
  }

  requireRun("git", ["fetch", "--tags", "--quiet"]);
  const tags = run("git", ["tag", "-l", `${SHARED_TAG_PREFIX}*`], ROOT)
    .stdout.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const markNumber = nextSharedMark(tags);
  const overlaid = existsSync(path.join(ROOT, SHARED_MARK_FILE))
    ? JSON.parse(readFileSync(path.join(ROOT, SHARED_MARK_FILE), "utf8"))
    : {};
  const mark = {
    mark: markNumber,
    patch: Number(overlaid.patch) || 0,
    label: typeof overlaid.label === "string" ? overlaid.label : `Shared ${markNumber}`,
    tag: `${SHARED_TAG_PREFIX}${markNumber}`,
    at: new Date().toISOString(),
    internalSha,
    sharedSha: "",
    title,
    url: `https://github.com/StrategyandDesign/fathers-com-clean-pilot/releases/tag/shared/${markNumber}`,
    revisions: Array.isArray(overlaid.revisions) ? overlaid.revisions : [],
  };
  writeMark(
    ROOT,
    mark,
    existsSync(path.join(ROOT, SHARED_LEDGER)) ? readFileSync(path.join(ROOT, SHARED_LEDGER), "utf8") : ""
  );
  requireRun("git", ["add", "-A"], ROOT);
  const dirty = run("git", ["diff", "--cached", "--quiet"], ROOT);
  if (dirty.status === 0) {
    log("no file changes after overlay");
    return { ok: true, skipped: true, reason: "no-change" };
  }
  requireRun("git", ["config", "user.name", "fathers-shared-bot"], ROOT);
  requireRun("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], ROOT);
  requireRun("git", ["commit", "-m", `Shared ${markNumber}. ${title}`], ROOT);
  mark.sharedSha = requireRun("git", ["rev-parse", "HEAD"], ROOT);
  requireRun("git", ["push", "origin", `HEAD:refs/heads/${SHARED_BRANCH}`], ROOT);
  run("git", ["tag", "-f", mark.tag, mark.sharedSha], ROOT);
  requireRun("git", ["push", "-f", "origin", `refs/tags/${mark.tag}`], ROOT);
  log(`Shared ${markNumber} tagged at ${mark.sharedSha.slice(0, 7)}`);
  return { ok: true, skipped: false, mark };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
if (invoked) {
  syncFromInternal().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
