import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  blockingDirty,
  cloneCandidates,
  needsRestart,
  parseArgs,
  syncRepo,
} from "../scripts/dev-live.mjs";

describe("live local sync", () => {
  it("includes the Desktop and home clones plus the current tree", () => {
    const clones = cloneCandidates("/Users/adm", "/Users/adm/Desktop/fathers-com-platform");
    assert.deepEqual(clones, [
      "/Users/adm/Desktop/fathers-com-platform",
      "/Users/adm/fathers-com-platform",
      "/Users/adm/Desktop/fathers-com-clean-pilot",
      "/Users/adm/fathers-com-clean-pilot",
    ]);
  });

  it("restarts Next only when install or server config files change", () => {
    assert.equal(needsRestart(["lib/i18n/messages/en.ts"]), false);
    assert.equal(needsRestart(["package-lock.json"]), true);
    assert.equal(needsRestart(["next.config.ts"]), true);
    assert.equal(needsRestart([".env.local"]), true);
  });

  it("lets untracked leftovers sit while a fast-forward runs", () => {
    assert.deepEqual(blockingDirty("?? veterans.html\n"), []);
    assert.deepEqual(blockingDirty(" M lib/i18n/messages/en.ts\n"), [
      " M lib/i18n/messages/en.ts",
    ]);
  });

  it("parses watch flags", () => {
    assert.deepEqual(parseArgs(["--watch-only"]), {
      watchOnly: true,
      once: false,
      port: 3000,
    });
  });

  it("fast-forwards a clean clone that is behind origin", () => {
    const calls: string[] = [];
    const runner = (cmd: string, args: string[]) => {
      const key = `${cmd} ${args.join(" ")}`;
      calls.push(key);
      if (key === "git rev-parse --abbrev-ref HEAD") return { status: 0, stdout: "cursor/clean-pilot-ux-refinements-7c78\n" };
      if (key === "git fetch --quiet origin cursor/clean-pilot-ux-refinements-7c78") {
        return { status: 0, stdout: "" };
      }
      if (key === "git rev-parse HEAD") return { status: 0, stdout: "aaa\n" };
      if (key === "git rev-parse origin/cursor/clean-pilot-ux-refinements-7c78") {
        return { status: 0, stdout: "bbb\n" };
      }
      if (key === "git status --porcelain") return { status: 0, stdout: "?? leftovers.html\n" };
      if (key === "git rev-list --count origin/cursor/clean-pilot-ux-refinements-7c78..HEAD") {
        return { status: 0, stdout: "0\n" };
      }
      if (key === "git merge --ff-only --quiet origin/cursor/clean-pilot-ux-refinements-7c78") {
        return { status: 0, stdout: "" };
      }
      if (key === "git diff --name-only aaa bbb") {
        return { status: 0, stdout: "lib/i18n/messages/en.ts\n" };
      }
      return { status: 1, stdout: "" };
    };

    const result = syncRepo("/tmp/repo", runner);
    assert.equal(result.ok, true);
    assert.equal(result.changed, true);
    assert.deepEqual(result.files, ["lib/i18n/messages/en.ts"]);
    assert.equal(calls.includes("git merge --ff-only --quiet origin/cursor/clean-pilot-ux-refinements-7c78"), true);
  });

  it("does not overwrite a dirty tracked file", () => {
    const runner = (cmd: string, args: string[]) => {
      const key = `${cmd} ${args.join(" ")}`;
      if (key === "git rev-parse --abbrev-ref HEAD") return { status: 0, stdout: "main\n" };
      if (key.startsWith("git fetch")) return { status: 0, stdout: "" };
      if (key === "git rev-parse HEAD") return { status: 0, stdout: "aaa\n" };
      if (key === "git rev-parse origin/main") return { status: 0, stdout: "bbb\n" };
      if (key === "git status --porcelain") return { status: 0, stdout: " M app/layout.tsx\n" };
      return { status: 0, stdout: "" };
    };
    const result = syncRepo("/tmp/repo", runner);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "dirty");
  });
});
