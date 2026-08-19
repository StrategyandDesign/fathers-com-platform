#!/usr/bin/env node
/**
 * Agent side of the live preview loop.
 * Pushes the current branch to origin with retries so the local puller
 * can fast-forward within a couple of seconds.
 */
import { pathToFileURL } from "node:url";
import { currentBranch, runGit } from "./git.mjs";

const cwd = process.env.LIVE_PREVIEW_CWD || process.cwd();
const remote = process.env.LIVE_PREVIEW_REMOTE || "origin";
const retries = [0, 4000, 8000, 16000, 32000];

function stamp(message) {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[live-preview ${time}] ${message}`);
}

export async function pushCurrentBranch(root = cwd) {
  const branch = await currentBranch(root);
  if (!branch) {
    return { ok: false, error: "detached HEAD" };
  }

  for (let attempt = 0; attempt < retries.length; attempt += 1) {
    if (retries[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, retries[attempt]));
    }
    const result = await runGit(
      root,
      ["push", "-u", remote, branch],
      { timeoutMs: 45_000 }
    );
    if (result.ok) {
      stamp(`pushed ${branch} to ${remote}`);
      return { ok: true, branch };
    }
    stamp(`push attempt ${attempt + 1} failed: ${result.stderr || result.stdout}`);
  }

  return { ok: false, error: "push failed after retries", branch };
}

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invoked && import.meta.url === invoked) {
  const result = await pushCurrentBranch();
  process.exit(result.ok ? 0 : 1);
}
