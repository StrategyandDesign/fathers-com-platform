import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("documentation layout", () => {
  it("keeps only the transfer-facing markdown files at the repo root", () => {
    const markdown = readdirSync(root)
      .filter((name) => name.endsWith(".md"))
      .sort();
    assert.deepEqual(markdown, [
      "AGENTS.md",
      "CONTRIBUTING.md",
      "README.md",
      "SHARED.md",
      "SUBMITS.md",
    ]);
  });

  it("does not leave static HTML or the old site folders at the repo root", () => {
    const html = readdirSync(root).filter((name) => name.endsWith(".html"));
    assert.deepEqual(html, []);
    for (const name of ["assets", "content", "data", "tools"]) {
      assert.equal(existsSync(join(root, name)), false, `${name}/ should not be at root`);
    }
  });

  it("keeps runbooks and the archived site on their documented paths", () => {
    assert.ok(existsSync(join(root, "docs/README.md")));
    assert.ok(existsSync(join(root, "docs/engineering/PILOT.md")));
    assert.ok(existsSync(join(root, "docs/product/README.md")));
    assert.ok(existsSync(join(root, "docs/archive/README.md")));
    assert.ok(existsSync(join(root, "archive/static-site/README.md")));
    assert.ok(existsSync(join(root, "handoff/00-SUBMISSION-GUIDE.md")));
  });
});
