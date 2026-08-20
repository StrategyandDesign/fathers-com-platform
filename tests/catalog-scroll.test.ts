import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_SCROLL_PEEK,
  CATALOG_VISIBLE_ROWS,
  catalogNeedsScroll,
  catalogScrollAtEnd,
  catalogScrollMaxHeight,
} from "../lib/manager/catalog-scroll";

describe("available training catalog scroll", () => {
  it("starts scrolling after three trainings", () => {
    assert.equal(CATALOG_VISIBLE_ROWS, 3);
    assert.equal(catalogNeedsScroll(3), false);
    assert.equal(catalogNeedsScroll(4), true);
  });

  it("caps the list at three rows plus a peek of the next card", () => {
    const rows = [
      { offsetTop: 0, offsetHeight: 180 },
      { offsetTop: 180, offsetHeight: 200 },
      { offsetTop: 380, offsetHeight: 190 },
      { offsetTop: 570, offsetHeight: 210 },
    ];

    assert.equal(catalogScrollMaxHeight(rows.slice(0, 3)), null);
    assert.equal(catalogScrollMaxHeight(rows), 380 + 190 + CATALOG_SCROLL_PEEK);
  });

  it("hides the fade when the list is at the bottom", () => {
    assert.equal(catalogScrollAtEnd(0, 400, 800), false);
    assert.equal(catalogScrollAtEnd(400, 400, 800), true);
    assert.equal(catalogScrollAtEnd(396, 400, 800), true);
  });
});
