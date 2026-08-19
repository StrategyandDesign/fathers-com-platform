#!/usr/bin/env node
/**
 * Starts the local puller and Next.js together.
 * `npm run dev` uses this so the Mac checkout stays a few seconds
 * behind the agent branch without a second command.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const puller = path.join(here, "local-pull.mjs");
const nextArgs = process.argv.slice(2);

const children = [];

function start(command, args, name) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.log(`[live-preview] ${name} stopped (${signal})`);
    } else if (code && code !== 0) {
      console.log(`[live-preview] ${name} exited ${code}`);
    }
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 200).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (process.env.LIVE_PREVIEW_PULL !== "0") {
  start(process.execPath, [puller], "puller");
}
start(path.join(root, "node_modules/.bin/next"), ["dev", "--turbopack", ...nextArgs], "next");
