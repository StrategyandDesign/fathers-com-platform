import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HOME_HERO_SLOT,
  HOME_PROFILE_SLOT,
  ORG_LOGO_SLOT,
  isOrgPhotoSlot,
  orgPhotoObjectPath,
  trainingPhotoSlot,
} from "../lib/org-photos/slots";
import { hasOrganizationLogo } from "../components/brand/organization-mark";

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

  it("hides the father chrome mark until a group logo is uploaded for the side ribbon", () => {
    assert.equal(hasOrganizationLogo(null), false);
    assert.equal(hasOrganizationLogo("   "), false);
    assert.equal(hasOrganizationLogo("/brand/group.png"), true);
  });
});
