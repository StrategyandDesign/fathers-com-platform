import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SHARED_LEDGER,
  SHARED_MARK_FILE,
  formatSharedLabel,
  formatSharedRevision,
  parseSharedLedger,
  readSharedMark,
  renderSharedLedger,
} from "./publish-shared.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const SOURCE_FILE = "shared-source.json";

export {
  formatSharedLabel,
  formatSharedRevision,
};

export function shouldBumpSharedPatch(remotePatch, headPatch, workPatch) {
  const remote = Number(remotePatch) || 0;
  const head = Number(headPatch) || 0;
  const work = Number(workPatch) || 0;
  return Math.max(head, work) <= remote;
}

export function nextSharedPatch(remotePatch, headPatch, workPatch) {
  const remote = Number(remotePatch) || 0;
  const head = Number(headPatch) || 0;
  const work = Number(workPatch) || 0;
  if (Math.max(head, work) > remote) return Math.max(head, work);
  return remote + 1;
}

export function appendDeskRevision(revisions, next) {
  const without = (revisions ?? []).filter((row) => row.revision !== next.revision);
  return [...without, next];
}

function run(cmd, args, cwd = REPO_ROOT) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8" });
}

function gitShow(ref, file, cwd = REPO_ROOT) {
  const result = run("git", ["show", `${ref}:${file}`], cwd);
  if (result.status !== 0) return "";
  return result.stdout;
}

function readMarkFrom(source) {
  if (!source.trim()) return null;
  return readSharedMark(source);
}

function deskBranch(root = REPO_ROOT) {
  try {
    const source = JSON.parse(readFileSync(path.join(root, SOURCE_FILE), "utf8"));
    return typeof source.branch === "string" ? source.branch : "";
  } catch {
    return "";
  }
}

function currentBranch(root = REPO_ROOT) {
  return run("git", ["rev-parse", "--abbrev-ref", "HEAD"], root).stdout.trim();
}

function commitTitle(root = REPO_ROOT) {
  const messagePath = run("git", ["rev-parse", "--git-path", "COMMIT_EDITMSG"], root).stdout.trim();
  if (!messagePath || !existsSync(messagePath)) return "Desk update";
  const first = readFileSync(messagePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  return first || "Desk update";
}

export function applySharedRevision(root, input = {}) {
  const markPath = path.join(root, SHARED_MARK_FILE);
  const ledgerPath = path.join(root, SHARED_LEDGER);
  const current = existsSync(markPath) ? readMarkFrom(readFileSync(markPath, "utf8")) : null;
  if (!current) return null;

  const patch = input.patch ?? current.patch ?? 1;
  const revision = formatSharedRevision(current.mark, patch);
  const label = formatSharedLabel(current.mark, patch);
  const date = (input.at ?? new Date().toISOString()).slice(0, 10);
  const title = input.title || current.title || "Desk update";
  const nextRow = {
    patch,
    revision,
    label,
    at: date,
    title,
  };
  const revisions = appendDeskRevision(current.revisions ?? [], nextRow);
  const next = {
    ...current,
    patch,
    label,
    title,
    revisions,
  };

  const marks = existsSync(ledgerPath) ? parseSharedLedger(readFileSync(ledgerPath, "utf8")) : [];
  writeFileSync(markPath, `${JSON.stringify(next, null, 2)}\n`);
  writeFileSync(ledgerPath, renderSharedLedger(marks, revisions));
  return next;
}

export function bumpDeskRevision(root = REPO_ROOT) {
  const branch = currentBranch(root);
  const expected = deskBranch(root);
  if (!expected || branch !== expected) {
    return { ok: true, skipped: true, reason: "not-desk-branch" };
  }

  const remoteRef = `origin/${expected}`;
  const remoteMark = readMarkFrom(gitShow(remoteRef, SHARED_MARK_FILE, root));
  const headMark = readMarkFrom(gitShow("HEAD", SHARED_MARK_FILE, root));
  const workMark = existsSync(path.join(root, SHARED_MARK_FILE))
    ? readMarkFrom(readFileSync(path.join(root, SHARED_MARK_FILE), "utf8"))
    : headMark;

  const remotePatch = remoteMark?.patch ?? 0;
  const headPatch = headMark?.patch ?? 0;
  const workPatch = workMark?.patch ?? headPatch;

  if (!shouldBumpSharedPatch(remotePatch, headPatch, workPatch)) {
    return {
      ok: true,
      skipped: true,
      reason: "already-stamped",
      label: formatSharedLabel(workMark?.mark ?? 1, Math.max(headPatch, workPatch)),
    };
  }

  const patch = nextSharedPatch(remotePatch, headPatch, workPatch);
  const next = applySharedRevision(root, {
    patch,
    title: commitTitle(root),
    at: new Date().toISOString(),
  });
  run("git", ["add", "--", SHARED_MARK_FILE, SHARED_LEDGER], root);
  return { ok: true, skipped: false, mark: next, label: next?.label };
}

async function main() {
  if (!process.argv.includes("--pre-commit")) return;
  const result = bumpDeskRevision();
  if (!result.ok) process.exit(1);
  if (!result.skipped && result.label) {
    console.log(`Desk badge ${result.label}`);
  }
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
if (invoked) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
