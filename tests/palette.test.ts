import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clientPaletteCookie,
  DEFAULT_PALETTE,
  isPalette,
  paletteClassName,
  parsePalette,
  resolvePalette,
} from "../lib/theme/palette";

describe("palette", () => {
  it("defaults to dark", () => {
    assert.equal(DEFAULT_PALETTE, "dark");
    assert.equal(resolvePalette(null), "dark");
    assert.equal(resolvePalette("nope"), "dark");
    assert.equal(paletteClassName("dark"), "dark");
    assert.equal(paletteClassName("light"), "light");
  });

  it("keeps an explicit saved choice", () => {
    assert.equal(parsePalette("light"), "light");
    assert.equal(parsePalette("dark"), "dark");
    assert.equal(isPalette("light"), true);
    assert.equal(resolvePalette("light", "dark"), "light");
    assert.equal(resolvePalette("dark", "light"), "dark");
  });

  it("uses system preference only before a saved choice", () => {
    assert.equal(resolvePalette(null, "light"), "light");
    assert.equal(resolvePalette(undefined, "dark"), "dark");
    assert.equal(resolvePalette("dark", "light"), "dark");
  });

  it("writes a client cookie for the chosen palette", () => {
    assert.match(clientPaletteCookie("light"), /^fc_palette=light;/);
    assert.match(clientPaletteCookie("dark"), /SameSite=Lax/);
  });
});
