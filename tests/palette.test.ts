import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  clientPaletteCookie,
  DEFAULT_PALETTE,
  isPalette,
  paletteClassName,
  parsePalette,
  resolvePalette,
} from "../lib/theme/palette";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

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

  it("puts the switcher only on Account", () => {
    const shell = readRepo("components/layout/role-shell.tsx");
    const account = readRepo("components/layout/account-view.tsx");
    assert.doesNotMatch(shell, /HeaderPaletteSwitch|PaletteSwitcher|PaletteForm/);
    assert.match(account, /<PaletteForm/);
  });

  it("keeps header chip text on the card color so Light does not hide the name", () => {
    const shell = readRepo("components/layout/role-shell.tsx");
    const menu = readRepo("components/layout/manager-header-menu.tsx");
    const ui = readRepo("lib/ui.ts");
    assert.match(ui, /headerChipClassName/);
    assert.match(ui, /text-card-foreground/);
    assert.match(shell, /lg:bg-card/);
    assert.match(shell, /lg:text-card-foreground/);
    assert.match(menu, /headerChipClassName/);
  });
});
