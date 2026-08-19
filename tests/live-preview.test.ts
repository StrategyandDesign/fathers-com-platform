import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { runGit } from "../scripts/live-preview/git.mjs";
import { pullOnce } from "../scripts/live-preview/pull-once.mjs";

async function git(cwd: string, ...args: string[]) {
  const result = await runGit(cwd, args);
  assert.equal(result.ok, true, result.stderr || result.stdout);
  return result.stdout;
}

async function makePair() {
  const root = mkdtempSync(path.join(tmpdir(), "live-preview-"));
  const bare = path.join(root, "remote.git");
  const agent = path.join(root, "agent");
  const local = path.join(root, "local");
  mkdirSync(bare);
  await git(bare, "init", "--bare");
  await git(root, "clone", bare, agent);
  await git(agent, "checkout", "-b", "cursor/live-sync-loop-7c78");
  writeFileSync(path.join(agent, "marker.txt"), "start\n");
  await git(agent, "add", "marker.txt");
  await git(agent, "-c", "user.email=loop@test", "-c", "user.name=Loop", "commit", "-m", "start");
  await git(agent, "push", "-u", "origin", "cursor/live-sync-loop-7c78");
  await git(root, "clone", bare, local);
  await git(local, "checkout", "cursor/live-sync-loop-7c78");
  return { agent, local, bare };
}

describe("live preview loop", () => {
  it("fast-forwards the local clone within a couple of seconds", async () => {
    const { agent, local } = await makePair();
    writeFileSync(path.join(agent, "marker.txt"), "update-1\n");
    await git(agent, "add", "marker.txt");
    await git(agent, "-c", "user.email=loop@test", "-c", "user.name=Loop", "commit", "-m", "update-1");
    await git(agent, "push", "origin", "cursor/live-sync-loop-7c78");

    const started = Date.now();
    const result = await pullOnce(local);
    const elapsed = Date.now() - started;

    assert.equal(result.ok, true);
    assert.equal(result.pulled, true);
    assert.equal(result.behind, 1);
    assert.ok(elapsed < 4000, `pull took ${elapsed}ms`);
    const marker = await git(local, "show", "HEAD:marker.txt");
    assert.equal(marker, "update-1");
  });

  it("keeps up with a burst of agent pushes", async () => {
    const { agent, local } = await makePair();
    const delays: number[] = [];

    for (let i = 1; i <= 8; i += 1) {
      writeFileSync(path.join(agent, "marker.txt"), `burst-${i}\n`);
      await git(agent, "add", "marker.txt");
      await git(agent, "-c", "user.email=loop@test", "-c", "user.name=Loop", "commit", "-m", `burst-${i}`);
      await git(agent, "push", "origin", "cursor/live-sync-loop-7c78");
      const started = Date.now();
      const result = await pullOnce(local);
      delays.push(Date.now() - started);
      assert.equal(result.pulled, true);
      const marker = await git(local, "show", "HEAD:marker.txt");
      assert.equal(marker, `burst-${i}`);
    }

    const slowest = Math.max(...delays);
    assert.ok(slowest < 4000, `slowest pull was ${slowest}ms`);
  });

  it("does not overwrite a dirty local tree", async () => {
    const { agent, local } = await makePair();
    writeFileSync(path.join(local, "marker.txt"), "my local edit\n");
    writeFileSync(path.join(agent, "marker.txt"), "agent edit\n");
    await git(agent, "add", "marker.txt");
    await git(agent, "-c", "user.email=loop@test", "-c", "user.name=Loop", "commit", "-m", "agent edit");
    await git(agent, "push", "origin", "cursor/live-sync-loop-7c78");

    const result = await pullOnce(local);
    assert.equal(result.skipped, "dirty");
    assert.equal(readFileSync(path.join(local, "marker.txt"), "utf8"), "my local edit\n");
  });

  it("no-ops when local is already current", async () => {
    const { local } = await makePair();
    const result = await pullOnce(local);
    assert.equal(result.skipped, "current");
    assert.equal(result.pulled, undefined);
  });

  it("background puller fast-forwards after an agent push", async () => {
    const { agent, local } = await makePair();
    const pullerPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../scripts/live-preview/local-pull.mjs"
    );
    const puller = spawn(process.execPath, [pullerPath], {
      env: {
        ...process.env,
        LIVE_PREVIEW_CWD: local,
        LIVE_PREVIEW_INTERVAL_MS: "400",
        LIVE_PREVIEW_LOG: path.join(local, ".live-preview.log"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    try {
      writeFileSync(path.join(agent, "marker.txt"), "from-agent\n");
      await git(agent, "add", "marker.txt");
      await git(agent, "-c", "user.email=loop@test", "-c", "user.name=Loop", "commit", "-m", "from-agent");
      await git(agent, "push", "origin", "cursor/live-sync-loop-7c78");

      const deadline = Date.now() + 5000;
      let marker = readFileSync(path.join(local, "marker.txt"), "utf8");
      while (Date.now() < deadline && marker !== "from-agent\n") {
        await new Promise((resolve) => setTimeout(resolve, 100));
        marker = readFileSync(path.join(local, "marker.txt"), "utf8");
      }

      assert.equal(marker, "from-agent\n");
      const log = readFileSync(path.join(local, ".live-preview.log"), "utf8");
      assert.match(log, /fast-forwarded/);
    } finally {
      puller.kill("SIGTERM");
    }
  });
});
