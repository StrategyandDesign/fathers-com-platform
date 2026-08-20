import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("trainings ribbon arrow", () => {
  it("fills with currentColor so light palette inverts the mark", () => {
    const mark = readRepo("components/brand/logo-arrow.tsx");
    assert.match(mark, /fill="currentColor"/);
    assert.doesNotMatch(mark, /#fff|#ffffff|#000|#141414/i);
    assert.doesNotMatch(mark, /stroke="currentColor"/);
  });

  it("uses the same side-ribbon size as Home", () => {
    const nav = readRepo("components/layout/app-nav.tsx");
    assert.match(nav, /icon: BrandLogoArrow/);
    assert.match(nav, /className=\{cn\("size-5"/);
  });
});
