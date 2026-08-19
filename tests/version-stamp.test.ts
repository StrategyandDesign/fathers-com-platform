import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { loadSharedMark } from "../lib/dev/shared-mark";

describe("version stamp", () => {
  it("reads the Shared mark from shared-mark.json", () => {
    const mark = loadSharedMark();
    assert.equal(mark?.mark, 1);
    assert.equal(mark?.tag, "shared/1");
  });

  it("puts Shared N on the root layout", () => {
    const layout = readFileSync(
      fileURLToPath(new URL("../app/layout.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(layout, /<VersionStamp/);
  });
});
