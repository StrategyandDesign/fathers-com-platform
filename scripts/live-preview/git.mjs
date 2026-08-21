import { spawn } from "node:child_process";

export function runGit(cwd, args, { timeoutMs = 20_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0,
        code: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

export async function currentBranch(cwd) {
  const result = await runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!result.ok || !result.stdout || result.stdout === "HEAD") return null;
  return result.stdout;
}

const IGNORED_DIRTY_PATHS = new Set([".live-preview.log"]);

export async function isDirty(cwd) {
  const result = await runGit(cwd, ["status", "--porcelain"]);
  if (!result.ok || !result.stdout) return false;
  return result.stdout.split("\n").some((line) => {
    const file = line.slice(3).trim().replace(/^\.\//, "");
    return file.length > 0 && !IGNORED_DIRTY_PATHS.has(file);
  });
}

export async function commitsBehind(cwd, remote, branch) {
  const result = await runGit(cwd, [
    "rev-list",
    "--count",
    `HEAD..${remote}/${branch}`,
  ]);
  if (!result.ok) return null;
  const count = Number.parseInt(result.stdout, 10);
  return Number.isFinite(count) ? count : null;
}
