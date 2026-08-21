import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Training } from "../lib/father/types";
import { buildManagerCatalog } from "../lib/manager/catalog";

function training(overrides: Partial<Training> & Pick<Training, "id" | "title">): Training {
  return {
    slug: overrides.slug ?? overrides.id,
    description: null,
    session_count: 6,
    order_index: 10,
    published: true,
    first_published_at: "2026-01-01T00:00:00.000Z",
    released_at: null,
    first_released_at: null,
    ...overrides,
  };
}

describe("manager catalog", () => {
  it("lists legacy catalog trainings a Leader can assign now", () => {
    const fundamentals = training({
      id: "fundamentals",
      title: "Fathering Fundamentals",
      order_index: 1,
    });
    const items = buildManagerCatalog({
      trainings: [fundamentals],
      pending: [],
      accepted: [],
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.status, "catalog");
    assert.equal(items[0]?.href, "/manager/reviews/fundamentals");
  });

  it("includes released trainings waiting on the Leader, and those already accepted", () => {
    const released = training({
      id: "presence",
      title: "Coming Home Present",
      order_index: 2,
      released_at: "2026-08-01T00:00:00.000Z",
      first_released_at: "2026-08-01T00:00:00.000Z",
    });
    const accepted = training({
      id: "anger",
      title: "Steady Under Pressure",
      order_index: 3,
      released_at: "2026-08-02T00:00:00.000Z",
      first_released_at: "2026-08-02T00:00:00.000Z",
    });
    const items = buildManagerCatalog({
      trainings: [released, accepted],
      pending: [
        {
          training: released,
          sessionCount: 12,
          groupId: "org-1",
          groupName: "Pilot",
        },
      ],
      accepted: [
        {
          training: accepted,
          sessionCount: 12,
          groupId: "org-1",
          groupName: "Pilot",
        },
      ],
    });

    assert.deepEqual(
      items.map((item) => item.status),
      ["pending", "ready"]
    );
    assert.equal(items[0]?.href, "/manager/reviews/presence?group=org-1");
  });

  it("keeps declined trainings in the available list", () => {
    const declined = training({
      id: "declined",
      title: "Declined",
      released_at: "2026-08-01T00:00:00.000Z",
      first_released_at: "2026-08-01T00:00:00.000Z",
    });
    const items = buildManagerCatalog({
      trainings: [declined],
      pending: [],
      accepted: [],
      declined: [
        {
          training: declined,
          sessionCount: 8,
          groupId: "org-1",
          groupName: "Pilot",
        },
      ],
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.status, "declined");
    assert.equal(items[0]?.groupId, "org-1");
  });

  it("does not list unpublished or trainings released only to other orgs", () => {
    const draft = training({
      id: "draft",
      title: "Draft",
      published: false,
      first_published_at: null,
    });
    const otherOrg = training({
      id: "other",
      title: "Other org only",
      released_at: "2026-08-01T00:00:00.000Z",
      first_released_at: "2026-08-01T00:00:00.000Z",
    });
    const items = buildManagerCatalog({
      trainings: [draft, otherOrg],
      pending: [],
      accepted: [],
    });

    assert.equal(items.length, 0);
  });

  it("does not duplicate a legacy training that is already accepted", () => {
    const fundamentals = training({
      id: "fundamentals",
      title: "Fathering Fundamentals",
      order_index: 1,
    });
    const items = buildManagerCatalog({
      trainings: [fundamentals],
      pending: [],
      accepted: [
        {
          training: fundamentals,
          sessionCount: 9,
          groupId: "org-1",
        },
      ],
    });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.status, "ready");
  });
});
