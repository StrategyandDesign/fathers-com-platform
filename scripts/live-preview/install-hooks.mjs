#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const hookDir = path.join(root, ".git/hooks");
if (!existsSync(path.join(root, ".git"))) {
  process.exit(0);
}
mkdirSync(hookDir, { recursive: true });

const marker = "scripts/live-preview/agent-push.mjs";
const hook = `#!/bin/sh
# Pushes cursor/* branches so the local live-preview puller can fast-forward.
if [ "\${LIVE_PREVIEW_AUTO_PUSH:-1}" = "0" ]; then
  exit 0
fi
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
case "$branch" in
  cursor/*)
    root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
    if [ -n "$root" ] && [ -f "$root/scripts/live-preview/agent-push.mjs" ]; then
      node "$root/scripts/live-preview/agent-push.mjs" >/dev/null 2>&1 &
    fi
    ;;
esac
`;

for (const name of ["post-commit", "post-merge"]) {
  const file = path.join(hookDir, name);
  if (existsSync(file)) {
    const current = readFileSync(file, "utf8");
    if (current.includes(marker)) continue;
  }
  writeFileSync(file, hook, { encoding: "utf8" });
  chmodSync(file, 0o755);
}
