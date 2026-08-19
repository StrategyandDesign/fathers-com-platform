import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { formatSharedLabel, formatSharedRevision, loadSharedMark } from "../lib/dev/shared-mark";

describe("version stamp", () => {
  it("reads the Shared mark from shared-mark.json", () => {
    const mark = loadSharedMark();
    assert.equal(mark?.mark, 1);
    assert.equal(mark?.patch, 1);
    assert.equal(mark?.tag, "shared/1");
    assert.equal(mark?.label, "Shared 1-1.01");
  });

  it("formats Shared 1-1.01 and the next ticks", () => {
    assert.equal(formatSharedRevision(1, 0), "");
    assert.equal(formatSharedLabel(1, 0), "Shared 1");
    assert.equal(formatSharedRevision(1, 1), "1.01");
    assert.equal(formatSharedLabel(1, 1), "Shared 1-1.01");
    assert.equal(formatSharedLabel(1, 12), "Shared 1-1.12");
  });

  it("puts Shared N on the root layout", () => {
    const layout = readFileSync(
      fileURLToPath(new URL("../app/layout.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(layout, /<VersionStamp/);
  });

  it("renders the desk label on the stamp", () => {
    const stamp = readFileSync(
      fileURLToPath(new URL("../components/dev/version-stamp.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(stamp, /formatSharedLabel/);
    assert.match(stamp, /\{label\}/);
  });
});
