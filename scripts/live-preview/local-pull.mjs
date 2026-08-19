#!/usr/bin/env node
/**
 * Local side of the live preview loop.
 * Fast-forwards the current branch from origin every few seconds so
 * Next.js hot-reload can pick up agent pushes. Never force-resets.
 * Skips while the working tree has local edits.
 */
import { appendFileSync } from "node:fs";
import path from "node:path";
import { pullOnce } from "./pull-once.mjs";

const intervalMs = Number.parseInt(process.env.LIVE_PREVIEW_INTERVAL_MS ?? "2000", 10);
const once = process.env.LIVE_PREVIEW_ONCE === "1";
const cwd = process.env.LIVE_PREVIEW_CWD || process.cwd();
const logFile = process.env.LIVE_PREVIEW_LOG || path.join(cwd, ".live-preview.log");

function stamp(message) {
  const time = new Date().toISOString().slice(11, 19);
  const line = `[live-preview ${time}] ${message}`;
  console.log(line);
  try {
    appendFileSync(logFile, `${line}\n`);
  } catch {
    // Log file is best-effort; the terminal line is enough.
  }
}

async function tick() {
  const result = await pullOnce(cwd);
  if (!result.ok) {
    stamp(`pull failed on ${result.branch ?? "unknown"}: ${result.error}`);
    return result;
  }
  if (result.pulled) {
    stamp(`fast-forwarded ${result.branch} (${result.behind} commit${result.behind === 1 ? "" : "s"})`);
  }
  return result;
}

if (once) {
  const result = await tick();
  process.exit(result.ok ? 0 : 1);
}

stamp(`watching ${cwd} every ${intervalMs}ms`);
await tick();
const timer = setInterval(() => {
  void tick();
}, intervalMs);

const stop = () => {
  clearInterval(timer);
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
