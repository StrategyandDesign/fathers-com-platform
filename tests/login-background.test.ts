import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  LOGIN_BACKGROUND_OBJECT_PATH,
  LOGIN_BACKGROUND_SLOT,
  isLoginBackgroundSlot,
} from "../lib/platform-photos/slots";
import { validateLoginBackground } from "../lib/platform-photos/image";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("login background slot", () => {
  it("has no default photo — sign-in is black until Super-admin adds one", () => {
    const slots = readRepo("lib/platform-photos/slots.ts");
    const data = readRepo("lib/platform-photos/data.ts");
    assert.equal(LOGIN_BACKGROUND_SLOT, "login_background");
    assert.equal(LOGIN_BACKGROUND_OBJECT_PATH, "login_background");
    assert.equal(isLoginBackgroundSlot("login_background"), true);
    assert.equal(isLoginBackgroundSlot("home_hero"), false);
    assert.doesNotMatch(slots, /DEFAULT_LOGIN_BACKGROUND|BRAND_PHOTOS/);
    assert.match(data, /url: null/);
    assert.match(data, /isCustom: false/);
  });

  it("asks for a wide photo and rejects a tiny square", () => {
    assert.equal(validateLoginBackground({ width: 2400, height: 1000 }), null);
    assert.match(
      validateLoginBackground({ width: 400, height: 400 }) ?? "",
      /wider|small/i
    );
  });
});

describe("login background desk", () => {
  it("fills the auth shell behind the existing sign-in window", () => {
    const layout = readRepo("app/(auth)/layout.tsx");
    const login = readRepo("app/(auth)/login/page.tsx");
    const appearance = readRepo("app/(admin)/admin/appearance/page.tsx");
    const home = readRepo("app/(admin)/admin/page.tsx");
    const nav = readRepo("components/layout/app-nav.tsx");
    const actions = readRepo("lib/platform-photos/actions.ts");
    const migration = readRepo("supabase/migrations/20260820040000_login_background.sql");
    const header = readRepo("components/layout/manager-header-menu.tsx");
    const copy = readRepo("lib/i18n/messages/en.ts");

    assert.match(layout, /loadLoginBackground/);
    assert.match(layout, /bg-black/);
    assert.match(layout, /data-login-background/);
    assert.match(layout, /background\.url \?/);
    assert.match(layout, /object-cover/);
    assert.match(layout, /max-w-\[24rem\]/);
    assert.match(layout, /size="display"/);
    assert.match(layout, /gap-2/);
    assert.doesNotMatch(layout, /mb-8/);
    assert.doesNotMatch(layout, /BRAND_PHOTOS|woods|DEFAULT_LOGIN/);
    assert.match(readRepo("components/brand/logo.tsx"), /size === "display" \? "h-12"/);
    assert.match(login, /<Card>/);
    assert.doesNotMatch(login, /loadLoginBackground/);
    assert.match(appearance, /requireRole\("admin"\)/);
    assert.match(appearance, /LoginBackgroundSlot/);
    assert.doesNotMatch(appearance, /DEFAULT_LOGIN_BACKGROUND/);
    assert.match(home, /\/admin\/appearance/);
    assert.match(home, /Login background/);
    assert.match(home, /black until you add a panoramic photo/);
    assert.match(nav, /nav\.appearance/);
    assert.match(nav, /\/admin\/appearance/);
    assert.match(actions, /requireRole\("admin"\)/);
    assert.match(actions, /uploadLoginBackground/);
    assert.match(actions, /resetLoginBackground/);
    assert.match(actions, /Sign-in is black again for everyone/);
    assert.match(copy, /Sign-in is black until you add a panoramic photo/);
    assert.match(copy, /Leaders, Super-admins, and participants all see it/);
    assert.match(migration, /platform_photos/);
    assert.match(migration, /is_super_admin/);
    assert.match(migration, /to anon, authenticated/);
    assert.match(migration, /platform-photos/);
    assert.doesNotMatch(header, /appearance|login.background|\/admin\/appearance/i);
  });

  it("keeps organization photo work on Org Photos", () => {
    const photos = readRepo("app/(manager)/manager/account/photos/page.tsx");
    const appearance = readRepo("app/(admin)/admin/appearance/page.tsx");
    assert.match(photos, /OrganizationPhotoSlot/);
    assert.doesNotMatch(appearance, /OrganizationPhotoSlot/);
    assert.doesNotMatch(photos, /uploadLoginBackground/);
  });
});
