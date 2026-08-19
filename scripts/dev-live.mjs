import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LIVE_INTERVAL_MS = 4000;
export const DEFAULT_PORT = 3000;
export const LOCK_NAME = "fathers-dev-live.lock";
export const LAUNCH_LABEL = "com.fatherscom.live-local";
export const RESTART_PATTERNS = [
  /^package-lock\.json$/,
  /^package\.json$/,
  /^next\.config\./,
  /^middleware\./,
  /^tsconfig\.json$/,
  /^\.env/,
];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);

export function cloneCandidates(home, cwd) {
  const extras = [
    path.join(home, "Desktop", "fathers-com-platform"),
    path.join(home, "fathers-com-platform"),
    path.join(home, "Desktop", "fathers-com-clean-pilot"),
    path.join(home, "fathers-com-clean-pilot"),
  ];
  const seen = new Set();
  const out = [];
  for (const dir of [cwd, ...extras]) {
    if (!dir) continue;
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
  }
  return out;
}

export function needsRestart(files) {
  return files.some((file) => RESTART_PATTERNS.some((pattern) => pattern.test(file)));
}

export function blockingDirty(porcelain) {
  if (!porcelain.trim()) return [];
  return porcelain
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith("??"));
}

export function parseArgs(argv) {
  return {
    watchOnly: argv.includes("--watch-only") || argv.includes("--no-next"),
    once: argv.includes("--once"),
    port: DEFAULT_PORT,
  };
}

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8" });
}

function log(message) {
  const stamp = new Date().toISOString();
  console.log(`[live-local ${stamp}] ${message}`);
}

function lockPath() {
  return path.join(os.tmpdir(), LOCK_NAME);
}

function pidAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockPid() {
  try {
    const raw = readFileSync(lockPath(), "utf8").trim();
    return Number.parseInt(raw, 10);
  } catch {
    return NaN;
  }
}

function tryAcquireLock() {
  const file = lockPath();
  try {
    const fd = openSync(file, "wx");
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch {
    const pid = readLockPid();
    if (pid === process.pid) return true;
    if (!pidAlive(pid)) {
      try {
        unlinkSync(file);
      } catch {
        /* ignore */
      }
      return tryAcquireLock();
    }
    return false;
  }
}

function releaseLock() {
  const pid = readLockPid();
  if (pid === process.pid) {
    try {
      unlinkSync(lockPath());
    } catch {
      /* ignore */
    }
  }
}

async function acquireLock(waitMs = 250) {
  for (;;) {
    if (tryAcquireLock()) return;
    await sleep(waitMs);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function listenCwd(port = DEFAULT_PORT) {
  const listing = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  });
  if (listing.status !== 0 || !listing.stdout.trim()) return null;
  const rows = listing.stdout.trim().split("\n").slice(1);
  if (!rows.length) return null;
  const pid = rows[0].trim().split(/\s+/)[1];
  if (!pid) return null;
  const cwdListing = spawnSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], {
    encoding: "utf8",
  });
  const line = cwdListing.stdout.split("\n").find((entry) => entry.startsWith("n"));
  return line ? line.slice(1) : null;
}

function isGitRepo(dir) {
  return existsSync(path.join(dir, ".git"));
}

function existingClones(home, cwd) {
  return cloneCandidates(home, cwd).filter(isGitRepo);
}

function currentBranch(cwd, runner = run) {
  const result = runner("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  return result.status === 0 ? result.stdout.trim() : "";
}

export function syncRepo(cwd, runner = run) {
  const branch = currentBranch(cwd, runner);
  if (!branch || branch === "HEAD") {
    return { ok: false, reason: "detached", changed: false, files: [] };
  }
  const fetch = runner("git", ["fetch", "--quiet", "origin", branch], cwd);
  if (fetch.status !== 0) {
    return { ok: false, reason: "fetch", changed: false, files: [] };
  }
  const local = runner("git", ["rev-parse", "HEAD"], cwd).stdout.trim();
  const remoteResult = runner("git", ["rev-parse", `origin/${branch}`], cwd);
  if (remoteResult.status !== 0) {
    return { ok: false, reason: "no-remote", changed: false, files: [] };
  }
  const remote = remoteResult.stdout.trim();
  if (local === remote) {
    return { ok: true, reason: "current", changed: false, sha: local, files: [] };
  }
  const dirty = blockingDirty(runner("git", ["status", "--porcelain"], cwd).stdout);
  if (dirty.length) {
    return { ok: false, reason: "dirty", changed: false, files: [] };
  }
  const ahead = runner("git", ["rev-list", "--count", `origin/${branch}..HEAD`], cwd)
    .stdout.trim();
  if (ahead !== "0") {
    return { ok: false, reason: "ahead", changed: false, files: [] };
  }
  const merge = runner("git", ["merge", "--ff-only", "--quiet", `origin/${branch}`], cwd);
  if (merge.status !== 0) {
    return { ok: false, reason: "ff-failed", changed: false, files: [] };
  }
  const files = runner("git", ["diff", "--name-only", local, remote], cwd)
    .stdout.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { ok: true, reason: "updated", changed: true, sha: remote, files };
}

function installDepsIfNeeded(cwd, files) {
  if (!files.includes("package-lock.json") && !files.includes("package.json")) return;
  log(`installing dependencies in ${cwd}`);
  const result = run("npm", ["install", "--no-fund", "--no-audit"], cwd);
  if (result.status !== 0) {
    log(`npm install failed in ${cwd}`);
  }
}

function writeLaunchAgent(home, execPath, scriptPath, workingDirectory) {
  const agentsDir = path.join(home, "Library", "LaunchAgents");
  mkdirSync(agentsDir, { recursive: true });
  const plistPath = path.join(agentsDir, `${LAUNCH_LABEL}.plist`);
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
    <string>${scriptPath}</string>
    <string>--watch-only</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${workingDirectory}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${path.join(os.tmpdir(), "fathers-dev-live.log")}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(os.tmpdir(), "fathers-dev-live.log")}</string>
</dict>
</plist>
`;
  writeFileSync(plistPath, plist);
  const uid = process.getuid?.() ?? "";
  spawnSync("launchctl", ["bootout", `gui/${uid}/${LAUNCH_LABEL}`], { encoding: "utf8" });
  spawnSync("launchctl", ["bootstrap", `gui/${uid}`, plistPath], { encoding: "utf8" });
  return plistPath;
}

function startNext(cwd, port) {
  const child = spawn(
    "npx",
    ["next", "dev", "--turbopack", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd, stdio: "inherit", env: process.env }
  );
  child.on("exit", (code) => {
    if (code && code !== 0) log(`next exited ${code}`);
  });
  return child;
}

function stopNext(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
}

async function syncAll(clones) {
  const updates = [];
  for (const cwd of clones) {
    const result = syncRepo(cwd);
    if (result.changed) {
      log(`updated ${cwd} to ${(result.sha ?? "").slice(0, 7)}`);
      installDepsIfNeeded(cwd, result.files);
      updates.push({ cwd, ...result });
    } else if (!result.ok && result.reason !== "current") {
      log(`skipped ${cwd} (${result.reason})`);
    }
  }
  return updates;
}

async function main() {
  if (process.env.FATHERS_LIVE_SYNC === "0") {
    if (!process.argv.includes("--watch-only") && !process.argv.includes("--once")) {
      const child = startNext(process.cwd(), DEFAULT_PORT);
      child.on("exit", (code) => process.exit(code ?? 0));
      return;
    }
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const home = os.homedir();
  const served = listenCwd(args.port);
  const clones = existingClones(home, cwd);
  if (served && isGitRepo(served) && !clones.includes(path.resolve(served))) {
    clones.unshift(path.resolve(served));
  }

  if (process.platform === "darwin") {
    try {
      writeLaunchAgent(home, process.execPath, SCRIPT_PATH, served || cwd);
    } catch (error) {
      log(`launch agent skipped: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (args.once) {
    await syncAll(clones);
    return;
  }

  await acquireLock();
  process.on("exit", releaseLock);
  process.on("SIGINT", () => {
    releaseLock();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    releaseLock();
    process.exit(0);
  });

  await syncAll(clones);

  let nextChild = null;
  const portTaken = Boolean(listenCwd(args.port));
  if (!args.watchOnly && !portTaken) {
    nextChild = startNext(cwd, args.port);
  } else if (!args.watchOnly && portTaken) {
    log(`port ${args.port} already serving ${served || "an app"}; keeping that process`);
  } else {
    log(`watching ${clones.join(", ") || cwd}`);
  }

  for (;;) {
    await sleep(LIVE_INTERVAL_MS);
    const updates = await syncAll(clones);
    const servedNow = listenCwd(args.port);
    const servedUpdate = updates.find((update) => {
      if (!servedNow) return update.cwd === path.resolve(cwd);
      return path.resolve(update.cwd) === path.resolve(servedNow);
    });
    if (servedUpdate && needsRestart(servedUpdate.files) && nextChild) {
      log("restarting next after config or dependency change");
      stopNext(nextChild);
      nextChild = startNext(servedUpdate.cwd, args.port);
    }
  }
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
if (invoked) {
  main().catch((error) => {
    console.error(error);
    releaseLock();
    process.exit(1);
  });
}
