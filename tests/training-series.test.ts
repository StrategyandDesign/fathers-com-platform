import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { trainingCoverSlug } from "../lib/trainings/series";

describe("training cover slug", () => {
  it("uses the training slug", () => {
    assert.equal(trainingCoverSlug({ slug: "fundamentals" }), "fundamentals");
    assert.equal(trainingCoverSlug({ slug: "reentry" }), "reentry");
  });
});
