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
import { initials } from "../lib/ui";

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

  it("falls back to group initials for the father left icon when no logo is set", () => {
    assert.equal(initials("Unit 8200"), "U8");
    assert.equal(initials("Returning Home NWA"), "RH");
  });
});
