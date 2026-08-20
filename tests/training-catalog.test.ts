import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("training catalog decisions", () => {
  it("keeps include, decline, and view on one row", () => {
    const catalog = readRepo("components/manager/training-catalog.tsx");
    assert.match(catalog, /flex flex-row flex-wrap items-center gap-2/);
    assert.match(catalog, /CatalogDecisionButtons/);
    assert.match(catalog, /manager\.trainings\.viewTraining/);
    assert.doesNotMatch(catalog, /StatusMark/);
  });

  it("scrolls available trainings after three cards", () => {
    const catalog = readRepo("components/manager/training-catalog.tsx");
    const scroller = readRepo("components/manager/catalog-scroll-list.tsx");
    const styles = readRepo("app/globals.css");

    assert.match(catalog, /CatalogScrollList/);
    assert.match(scroller, /brand-scroll/);
    assert.match(scroller, /overflow-y-auto/);
    assert.match(scroller, /CATALOG_VISIBLE_ROWS/);
    assert.match(styles, /\.brand-scroll\s*\{/);
    assert.match(styles, /scrollbar-width:\s*thin/);
  });

  it("shows Included in green and Declined in red on the selected button", () => {
    const buttons = readRepo("components/manager/catalog-decision-buttons.tsx");
    assert.match(buttons, /manager\.trainings\.included/);
    assert.match(buttons, /manager\.trainings\.declined/);
    assert.match(buttons, /manager\.trainings\.include/);
    assert.match(buttons, /manager\.trainings\.decline/);
    assert.match(buttons, /disabled:opacity-100/);
    assert.match(buttons, /bg-destructive text-white/);
  });
});
