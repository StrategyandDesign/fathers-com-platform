import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHARED_REMOTE = "clean-pilot-only";
export const SHARED_REPO = "StrategyandDesign/fathers-com-clean-pilot";
export const SHARED_REPO_URL = `https://github.com/${SHARED_REPO}`;
export const SHARED_BRANCH = "review";
export const SHARED_TAG_PREFIX = "shared/";
export const SHARED_LEDGER = "SHARED.md";
export const SHARED_MARK_FILE = "shared-mark.json";
export const FROZEN_REF_PREFIX = "submit/";

export const PRESERVE_PATHS = [
  "lib/i18n/messages/he.ts",
  "lib/i18n/messages/he-overlay.ts",
  "lib/i18n/messages/types.ts",
  "lib/i18n/translate.ts",
];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const HOOKS_DIR = path.join(SCRIPT_DIR, "git-hooks");

export function nextSharedMark(tags) {
  let max = 0;
  for (const tag of tags) {
    const match = String(tag).trim().match(/^shared\/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

export function isSharedRemote(name, url = "") {
  const haystack = `${name} ${url}`;
  return name === SHARED_REMOTE || /fathers-com-clean-pilot/.test(haystack);
}

export function isInternalRemote(name, url = "") {
  const haystack = `${name} ${url}`;
  return name === "origin" || /fathers-com-platform/.test(haystack);
}

export function shouldPreserve(filePath) {
  return PRESERVE_PATHS.includes(filePath.replace(/\\/g, "/"));
}

export function markUrl(mark) {
  return `${SHARED_REPO_URL}/releases/tag/shared/${mark}`;
}

export function upsertLedgerRow(rows, next) {
  const byMark = new Map(rows.map((row) => [row.mark, row]));
  byMark.set(next.mark, next);
  return [...byMark.values()].sort((a, b) => a.mark - b.mark);
}

export function renderSharedLedger(rows) {
  const lines = [
    "# Shared marks",
    "",
    "Numbered pushes on the review copy Micah and Eric share:",
    "",
    SHARED_REPO_URL,
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
  return lines.join("\n");
}

export function parseSharedLedger(markdown) {
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

export function readSharedMark(source = "{}") {
  try {
    const parsed = JSON.parse(source);
    const mark = Number(parsed.mark);
    if (!Number.isInteger(mark) || mark < 1) return null;
    return {
      mark,
      tag: typeof parsed.tag === "string" ? parsed.tag : `${SHARED_TAG_PREFIX}${mark}`,
      at: typeof parsed.at === "string" ? parsed.at : "",
      internalSha: typeof parsed.internalSha === "string" ? parsed.internalSha : "",
      sharedSha: typeof parsed.sharedSha === "string" ? parsed.sharedSha : "",
      title: typeof parsed.title === "string" ? parsed.title : "",
      url: typeof parsed.url === "string" ? parsed.url : markUrl(mark),
    };
  } catch {
    return null;
  }
}

function run(cmd, args, cwd = REPO_ROOT, options = {}) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: options.encoding ?? "utf8",
    input: options.input,
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

function log(message) {
  console.log(`[shared-publish ${new Date().toISOString()}] ${message}`);
}

function git(args, cwd = REPO_ROOT, env) {
  return run("git", args, cwd, { env });
}

function requireGit(args, cwd = REPO_ROOT, env) {
  const result = git(args, cwd, env);
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

export function installHooks(root = REPO_ROOT) {
  if (!existsSync(path.join(root, ".git"))) return false;
  requireGit(["config", "core.hooksPath", path.relative(root, HOOKS_DIR)], root);
  return true;
}

function ensureSharedRemote() {
  const remotes = git(["remote"]).stdout.split("\n").map((line) => line.trim());
  if (remotes.includes(SHARED_REMOTE)) return;
  requireGit(["remote", "add", SHARED_REMOTE, `${SHARED_REPO_URL}.git`]);
}

function listSharedTags() {
  git(["fetch", "--tags", "--quiet", SHARED_REMOTE]);
  const result = git(["ls-remote", "--tags", SHARED_REMOTE]);
  if (result.status !== 0) return [];
  return result.stdout
    .split("\n")
    .map((line) => {
      const match = line.match(/refs\/tags\/(shared\/\d+)/);
      return match ? match[1] : "";
    })
    .filter(Boolean);
}

function subjectFor(sha) {
  const subject = git(["log", "-1", "--format=%s", sha]).stdout.trim();
  return subject.replace(/^Shared \d+\.\s*/, "") || "Update";
}

function writeMarkFiles(dir, mark) {
  const ledgerPath = path.join(dir, SHARED_LEDGER);
  const existing = existsSync(ledgerPath) ? parseSharedLedger(readFileSync(ledgerPath, "utf8")) : [];
  const rows = upsertLedgerRow(existing, {
    mark: mark.mark,
    date: mark.at.slice(0, 10),
    tag: mark.tag,
    internalSha: mark.internalSha,
    title: mark.title,
  });
  writeFileSync(ledgerPath, renderSharedLedger(rows));
  writeFileSync(path.join(dir, SHARED_MARK_FILE), `${JSON.stringify(mark, null, 2)}\n`);
}

function overlayTree(sourceSha, worktree) {
  const archivePath = path.join(os.tmpdir(), `fathers-shared-${sourceSha.slice(0, 12)}.tar`);
  const archive = run("git", ["archive", "--format=tar", "-o", archivePath, sourceSha], REPO_ROOT);
  if (archive.status !== 0) {
    throw new Error(archive.stderr?.trim() || "Could not archive the internal tree.");
  }
  const extract = run("tar", ["-xf", archivePath], worktree);
  try {
    rmSync(archivePath, { force: true });
  } catch {
    /* ignore */
  }
  if (extract.status !== 0) {
    throw new Error(extract.stderr?.trim() || "Could not unpack the internal tree onto review.");
  }
  for (const file of PRESERVE_PATHS) {
    const result = git(["checkout", "HEAD", "--", file], worktree);
    if (result.status !== 0) {
      log(`kept missing isolated file ${file}`);
    }
  }
}

function ledgerHasSha(markdown, internalSha) {
  const short = internalSha.slice(0, 7);
  return parseSharedLedger(markdown).some(
    (row) => internalSha.startsWith(row.internalSha) || row.internalSha.startsWith(short)
  );
}

function alreadyPublished(internalSha) {
  const localPath = path.join(REPO_ROOT, SHARED_LEDGER);
  if (existsSync(localPath) && ledgerHasSha(readFileSync(localPath, "utf8"), internalSha)) {
    return true;
  }
  const remoteLedger = git(["show", `${SHARED_REMOTE}/${SHARED_BRANCH}:${SHARED_LEDGER}`]);
  if (remoteLedger.status === 0 && ledgerHasSha(remoteLedger.stdout, internalSha)) {
    return true;
  }
  return false;
}

export async function publishShared(input = {}) {
  const sourceSha = (input.sha || requireGit(["rev-parse", "HEAD"])).trim();
  const title = input.title || subjectFor(sourceSha);
  installHooks();
  ensureSharedRemote();
  requireGit(["fetch", "--quiet", SHARED_REMOTE, SHARED_BRANCH]);

  const tags = listSharedTags();
  if (alreadyPublished(sourceSha) && !input.force) {
    return { ok: true, skipped: true, reason: "already-published" };
  }

  const markNumber = nextSharedMark(tags);
  const at = new Date().toISOString();
  const mark = {
    mark: markNumber,
    tag: `${SHARED_TAG_PREFIX}${markNumber}`,
    at,
    internalSha: sourceSha,
    sharedSha: "",
    title,
    url: markUrl(markNumber),
  };

  const parent = path.join(os.tmpdir(), "fathers-shared-publish");
  mkdirSync(parent, { recursive: true });
  const worktree = mkdtempSync(path.join(parent, "review-"));

  try {
    requireGit(["worktree", "add", "--detach", worktree, `${SHARED_REMOTE}/${SHARED_BRANCH}`]);
    overlayTree(sourceSha, worktree);
    writeMarkFiles(worktree, mark);
    requireGit(["add", "-A"], worktree);
    const staged = git(["diff", "--cached", "--quiet"], worktree);
    if (staged.status === 0) {
      return { ok: true, skipped: true, reason: "no-change", mark };
    }
    requireGit(
      ["commit", "-m", `Shared ${markNumber}. ${title}`],
      worktree,
      { FATHERS_PUBLISHING: "1" }
    );
    mark.sharedSha = requireGit(["rev-parse", "HEAD"], worktree);
    const pushed = git(
      ["push", SHARED_REMOTE, `HEAD:refs/heads/${SHARED_BRANCH}`],
      worktree,
      { FATHERS_PUBLISHING: "1" }
    );
    if (pushed.status !== 0) {
      const detail = `${pushed.stderr} ${pushed.stdout}`;
      if (/403|Permission|denied/i.test(detail)) {
        log("This machine cannot write the shared repo. The Shared marks Action on review will number the push.");
        return { ok: true, skipped: true, reason: "delegated-to-action", mark };
      }
      throw new Error(detail.trim() || "Could not push the shared review branch.");
    }
    git(["tag", "-f", mark.tag, mark.sharedSha], worktree);
    requireGit(["push", "-f", SHARED_REMOTE, `refs/tags/${mark.tag}`], worktree, {
      FATHERS_PUBLISHING: "1",
    });
    writeMarkFiles(REPO_ROOT, mark);
    log(`Shared ${markNumber} is on ${SHARED_REPO} ${SHARED_BRANCH} at ${mark.sharedSha.slice(0, 7)}`);
    return { ok: true, skipped: false, mark };
  } finally {
    git(["worktree", "remove", "--force", worktree]);
    rmSync(worktree, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const args = {
    installHooks: argv.includes("--install-hooks"),
    sha: "",
    title: "",
    force: argv.includes("--force"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--sha") args.sha = argv[i + 1] ?? "";
    if (argv[i] === "--title") args.title = argv[i + 1] ?? "";
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  installHooks();
  if (args.installHooks && !args.sha && process.argv.length <= 3) {
    log("hooks installed");
    return;
  }
  const result = await publishShared({
    sha: args.sha,
    title: args.title,
    force: args.force,
  });
  if (!result.ok) process.exit(1);
  if (result.skipped) {
    log(`skipped (${result.reason})`);
    return;
  }
  log(`Shared ${result.mark.mark}: ${result.mark.url}`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
if (invoked) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
