import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("trainings ribbon arrow", () => {
  it("uses the official Arrow logo file, not a drawn variation", () => {
    const mark = readRepo("components/brand/logo-arrow.tsx");
    const arrowPath = fileURLToPath(new URL("../public/brand/fathers-com-arrow.png", import.meta.url));
    assert.equal(existsSync(arrowPath), true);
    assert.deepEqual(Array.from(readFileSync(arrowPath).subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.match(mark, /fathers-com-arrow\.png/);
    assert.match(mark, /bg-current/);
    assert.match(mark, /maskImage/);
    assert.doesNotMatch(mark, /#fff|#ffffff|#000|#141414/i);
    assert.doesNotMatch(mark, /<path/);
    assert.doesNotMatch(mark, /chevron stack/i);
  });

  it("uses the same side-ribbon size as Home", () => {
    const nav = readRepo("components/layout/app-nav.tsx");
    assert.match(nav, /icon: BrandLogoArrow/);
    assert.match(nav, /className=\{cn\("size-5"/);
  });

  it("puts Assessments above Impact Snapshot on the Leader ribbon", () => {
    const nav = readRepo("components/layout/app-nav.tsx");
    const manager = nav.slice(nav.indexOf("manager: ["), nav.indexOf("reviewer: ["));
    assert.ok(manager.indexOf('href: "/manager/assessments"') < manager.indexOf('href: "/manager/impact"'));
  });
});
