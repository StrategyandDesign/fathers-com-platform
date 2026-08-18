import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseDisplayName } from "../lib/account/display-name";

describe("parseDisplayName", () => {
  it("trims and collapses whitespace", () => {
    assert.deepEqual(parseDisplayName("  Maya   Chen  "), { name: "Maya Chen" });
  });

  it("keeps Hebrew names", () => {
    assert.deepEqual(parseDisplayName("מאיה כהן"), { name: "מאיה כהן" });
  });

  it("requires a name", () => {
    assert.deepEqual(parseDisplayName("   "), { error: "required" });
    assert.deepEqual(parseDisplayName(""), { error: "required" });
  });

  it("rejects names over 80 characters", () => {
    assert.deepEqual(parseDisplayName("A".repeat(81)), { error: "tooLong" });
    assert.deepEqual(parseDisplayName("A".repeat(80)), { name: "A".repeat(80) });
  });
});
