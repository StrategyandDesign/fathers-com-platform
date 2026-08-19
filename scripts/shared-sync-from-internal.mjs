import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRESERVE_PATHS,
  SHARED_BRANCH,
  SHARED_LEDGER,
  SHARED_MARK_FILE,
  SHARED_TAG_PREFIX,
  nextSharedMark,
  parseSharedLedger,
  renderSharedLedger,
  upsertLedgerRow,
} from "./publish-shared.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const SOURCE_FILE = "shared-source.json";

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

function readSource() {
  const raw = JSON.parse(readFileSync(path.join(ROOT, SOURCE_FILE), "utf8"));
  if (!raw.repo || !raw.branch) throw new Error("shared-source.json needs repo and branch.");
  return raw;
}

function writeMark(dir, mark, existingMarkdown) {
  const rows = upsertLedgerRow(parseSharedLedger(existingMarkdown), {
    mark: mark.mark,
    date: mark.at.slice(0, 10),
    tag: mark.tag,
    internalSha: mark.internalSha,
    title: mark.title,
  });
  writeFileSync(path.join(dir, SHARED_LEDGER), renderSharedLedger(rows));
  writeFileSync(path.join(dir, SHARED_MARK_FILE), `${JSON.stringify(mark, null, 2)}\n`);
}

export async function syncFromInternal() {
  const source = readSource();
  const sourceUrl = `https://github.com/${source.repo}.git`;
  const cloneDir = path.join(os.tmpdir(), "fathers-shared-internal");
  rmSync(cloneDir, { recursive: true, force: true });
  requireRun("git", ["clone", "--depth", "1", "--branch", source.branch, sourceUrl, cloneDir]);
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
  const mark = {
    mark: markNumber,
    tag: `${SHARED_TAG_PREFIX}${markNumber}`,
    at: new Date().toISOString(),
    internalSha,
    sharedSha: "",
    title,
    url: `https://github.com/StrategyandDesign/fathers-com-clean-pilot/releases/tag/shared/${markNumber}`,
  };
  writeMark(ROOT, mark, existsSync(path.join(ROOT, SHARED_LEDGER)) ? readFileSync(path.join(ROOT, SHARED_LEDGER), "utf8") : "");
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
  writeMark(ROOT, mark, readFileSync(path.join(ROOT, SHARED_LEDGER), "utf8"));
  requireRun("git", ["add", SHARED_LEDGER, SHARED_MARK_FILE], ROOT);
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
