import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  HOME_HERO_SLOT,
  HOME_PROFILE_SLOT,
  ORG_LOGO_SLOT,
  isOrgPhotoSlot,
  orgPhotoObjectPath,
  trainingPhotoSlot,
} from "../lib/org-photos/slots";
import { hasOrganizationLogo } from "../components/brand/organization-mark";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("organization photo slots", () => {
  it("accepts the group logo, Home cards, and catalog training covers", () => {
    const slugs = ["fathering-fundamentals", "steady-under-pressure"];
    assert.equal(isOrgPhotoSlot(ORG_LOGO_SLOT, slugs), true);
    assert.equal(isOrgPhotoSlot(HOME_HERO_SLOT, slugs), true);
    assert.equal(isOrgPhotoSlot(HOME_PROFILE_SLOT, slugs), true);
    assert.equal(isOrgPhotoSlot(trainingPhotoSlot("fathering-fundamentals"), slugs), true);
    assert.equal(isOrgPhotoSlot("training_unknown", slugs), false);
  });

  it("stores the logo on the same group path as the invite-code organization", () => {
    assert.equal(orgPhotoObjectPath("group-1", ORG_LOGO_SLOT), "group-1/org_logo");
    assert.equal(orgPhotoObjectPath("group-1", HOME_HERO_SLOT), "group-1/home_hero");
  });

  it("hides the father chrome mark until a group logo is uploaded", () => {
    assert.equal(hasOrganizationLogo(null), false);
    assert.equal(hasOrganizationLogo("   "), false);
    assert.equal(hasOrganizationLogo("/brand/group.png"), true);
  });

  it("sits the uploaded group mark in the header beside the lockup, not in the side ribbon", () => {
    const shell = readRepo("components/layout/role-shell.tsx");
    const aside = shell.slice(shell.indexOf("<aside"), shell.indexOf("</aside>"));
    assert.match(shell, /size="header"/);
    assert.match(shell, /bg-white\/20/);
    assert.match(shell, /BrandLogo[\s\S]*OrganizationMark[\s\S]*groupName/);
    assert.doesNotMatch(aside, /OrganizationMark/);
  });
});

describe("organization photo desk", () => {
  it("keeps photo management on Org Photos only", () => {
    const account = readRepo("app/(manager)/manager/account/page.tsx");
    const home = readRepo("app/(manager)/manager/page.tsx");
    const photos = readRepo("app/(manager)/manager/account/photos/page.tsx");
    const nav = readRepo("components/layout/app-nav.tsx");
    const lead = readRepo("lib/i18n/messages/en.ts");

    assert.doesNotMatch(account, /OrganizationLogoCard|managePhotos|account\/photos/);
    assert.doesNotMatch(home, /photosTitle|photosOpen|OrganizationMark|loadManagerOrganizationMarks/);
    assert.match(photos, /OrganizationLogoCard/);
    assert.match(photos, /OrganizationPhotoSlot/);
    assert.match(nav, /nav\.photos/);
    assert.match(nav, /\/manager\/account\/photos/);
    assert.doesNotMatch(lead, /organization mark, notifications/);
  });
});
