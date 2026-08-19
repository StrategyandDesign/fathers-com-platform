import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldBeginAutoAdvance } from "../lib/form/auto-advance";

describe("shouldBeginAutoAdvance", () => {
  const ready = {
    enabled: true,
    locked: false,
    alreadyStarted: false,
    checked: true,
    formValid: true,
  };

  it("starts only after the radio is checked and the form is valid", () => {
    assert.equal(shouldBeginAutoAdvance(ready), true);
    assert.equal(shouldBeginAutoAdvance({ ...ready, checked: false }), false);
    assert.equal(shouldBeginAutoAdvance({ ...ready, formValid: false }), false);
  });

  it("does not start a second time after Saving has already locked", () => {
    assert.equal(shouldBeginAutoAdvance({ ...ready, locked: true }), false);
    assert.equal(shouldBeginAutoAdvance({ ...ready, alreadyStarted: true }), false);
    assert.equal(shouldBeginAutoAdvance({ ...ready, enabled: false }), false);
  });
});
