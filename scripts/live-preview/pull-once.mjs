import { commitsBehind, currentBranch, isDirty, runGit } from "./git.mjs";

const DEFAULT_REMOTE = "origin";

export async function pullOnce(cwd, { remote = DEFAULT_REMOTE } = {}) {
  const branch = await currentBranch(cwd);
  if (!branch) {
    return { ok: true, skipped: "detached" };
  }

  if (await isDirty(cwd)) {
    return { ok: true, skipped: "dirty", branch };
  }

  const fetch = await runGit(cwd, ["fetch", "--quiet", remote, branch]);
  if (!fetch.ok) {
    return {
      ok: false,
      error: fetch.stderr || fetch.stdout || "fetch failed",
      branch,
    };
  }

  const behind = await commitsBehind(cwd, remote, branch);
  if (behind === null) {
    return { ok: true, skipped: "no-upstream", branch };
  }
  if (behind === 0) {
    return { ok: true, skipped: "current", branch };
  }

  const pull = await runGit(cwd, ["pull", "--ff-only", "--quiet", remote, branch]);
  if (!pull.ok) {
    return {
      ok: false,
      error: pull.stderr || pull.stdout || "fast-forward pull failed",
      branch,
      behind,
    };
  }

  return { ok: true, pulled: true, branch, behind };
}
