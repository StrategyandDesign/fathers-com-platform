import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_LOCALE,
  LOCALES,
  PUBLIC_LOCALES,
  SHOW_HEBREW,
  exposeLocale,
  isLocale,
  isPublicLocale,
  localeFromCookie,
} from "../lib/i18n/config";
import { localeFromGroup, localeFromGroups } from "../lib/i18n/org-locale";
import { he } from "../lib/i18n/messages/he";
import { createTranslator } from "../lib/i18n/translate";
import { resolveFatherLocale } from "../lib/manager/nudge-panel";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("Hebrew stays in the catalog and off the public surface", () => {
  it("keeps the Hebrew message file wired for translators", () => {
    assert.deepEqual([...LOCALES], ["en", "he"]);
    assert.equal(isLocale("he"), true);
    assert.equal(he.localeName, "עברית");
    assert.equal(createTranslator("he")("account.languageTitle"), "שפה");
    assert.match(readRepo("lib/i18n/translate.ts"), /from \"@\/lib\/i18n\/messages\/he\"/);
  });

  it("hides Hebrew from public locale resolution", () => {
    assert.equal(SHOW_HEBREW, false);
    assert.deepEqual([...PUBLIC_LOCALES], [DEFAULT_LOCALE]);
    assert.equal(isPublicLocale("he"), false);
    assert.equal(exposeLocale("he"), "en");
    assert.equal(localeFromCookie("he"), "en");
    assert.equal(localeFromGroup({ locale: "he" }), null);
    assert.equal(localeFromGroup({ code: "IL" }), null);
    assert.equal(localeFromGroups([{ locale: "he", code: "IL" }]), "en");
    assert.equal(resolveFatherLocale({ profileLocale: "he", groupLocale: "he" }), "en");
  });

  it("does not show a language picker on Account", () => {
    const account = readRepo("components/layout/account-view.tsx");
    const form = readRepo("components/i18n/language-form.tsx");
    const en = readRepo("lib/i18n/messages/en.ts");

    assert.match(account, /SHOW_HEBREW \? <LanguageForm/);
    assert.match(form, /if \(!SHOW_HEBREW\) return null/);
    assert.match(en, /fatherLead: "Your certificates, palette, notifications/);
    assert.doesNotMatch(en, /fatherLead: "Your certificates, palette, language/);
  });
});
