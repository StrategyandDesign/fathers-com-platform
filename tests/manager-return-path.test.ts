import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { managerAssignDestination } from "../lib/manager/return-path";

describe("manager assign return path", () => {
  it("returns the leader to the assign list after a roster assign", () => {
    const form = new FormData();
    form.set("return_to", "participants");
    assert.deepEqual(managerAssignDestination(form), {
      path: "/manager/participants",
      hash: "#assign",
    });
  });

  it("returns the leader to the dashboard without a missing status hash", () => {
    const form = new FormData();
    form.set("return_to", "dashboard");
    assert.deepEqual(managerAssignDestination(form), {
      path: "/manager",
      hash: "",
    });
  });

  it("falls back to the man’s page when return_to is detail", () => {
    const form = new FormData();
    form.set("return_to", "detail");
    form.set("father_id", "joe");
    assert.deepEqual(managerAssignDestination(form), {
      path: "/manager/participants/joe",
      hash: "",
    });
  });
});
