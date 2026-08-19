import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { en } from "../lib/i18n/messages/en";
import { he } from "../lib/i18n/messages/he";

const EM_DASH = "—";
const ALLOWED = new Set(["common.emDash"]);

function walk(
  value: unknown,
  path: string,
  hits: string[]
) {
  if (typeof value === "string") {
    if (!ALLOWED.has(path) && value.includes(EM_DASH)) {
      hits.push(path);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    walk(child, path ? `${path}.${key}` : key, hits);
  }
}

describe("product copy hygiene", () => {
  it("keeps sentence em dashes out of English and Hebrew UI strings", () => {
    const hits: string[] = [];
    walk(en, "", hits);
    walk(he, "", hits);
    assert.deepEqual(hits, []);
  });
});
