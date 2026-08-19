import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BRAND_PHOTOS,
  IL_PHOTOS,
  sessionCover,
  trainingCover,
} from "../lib/brand/photos";

describe("trainingCover", () => {
  it("maps the three catalog slugs to Stor room stills", () => {
    assert.equal(trainingCover("fundamentals"), BRAND_PHOTOS.houseThatKeptGoing);
    assert.equal(trainingCover("anger"), BRAND_PHOTOS.smallAndOftenCalendar);
    assert.equal(trainingCover("reentry"), BRAND_PHOTOS.doorwayGrowthMarks);
  });

  it("strips a trailing series number before mapping", () => {
    assert.equal(trainingCover("fundamentals-2"), BRAND_PHOTOS.houseThatKeptGoing);
    assert.equal(trainingCover("anger-3"), BRAND_PHOTOS.smallAndOftenCalendar);
    assert.equal(trainingCover("reentry-2"), BRAND_PHOTOS.doorwayGrowthMarks);
  });

  it("uses screen-is-a-room when the slug has no training cover", () => {
    assert.equal(trainingCover(""), BRAND_PHOTOS.screenIsARoom);
    assert.equal(trainingCover("unknown"), BRAND_PHOTOS.screenIsARoom);
  });

  it("leaves the IL pack mapping in place", () => {
    assert.equal(trainingCover("fundamentals", "il"), IL_PHOTOS.grove);
    assert.equal(trainingCover("anger", "il"), IL_PHOTOS.desert);
    assert.equal(trainingCover("reentry", "il"), IL_PHOTOS.hills);
    assert.equal(trainingCover("", "il"), IL_PHOTOS.grove);
  });
});

describe("sessionCover", () => {
  it("keeps Fundamentals sessions 1–9 on the existing photos", () => {
    assert.equal(sessionCover(1), BRAND_PHOTOS.shoulders);
    assert.equal(sessionCover(2), BRAND_PHOTOS.teen);
    assert.equal(sessionCover(3), BRAND_PHOTOS.park);
    assert.equal(sessionCover(4), BRAND_PHOTOS.running);
    assert.equal(sessionCover(5), BRAND_PHOTOS.bike);
    assert.equal(sessionCover(6), BRAND_PHOTOS.highfive);
    assert.equal(sessionCover(7), BRAND_PHOTOS.teen);
    assert.equal(sessionCover(8), BRAND_PHOTOS.woods);
    assert.equal(sessionCover(9), BRAND_PHOTOS.shoulders);
  });

  it("does not use course texture stills on session or IL session covers", () => {
    const courseTexture = new Set([
      BRAND_PHOTOS.houseThatKeptGoing,
      BRAND_PHOTOS.doorwayGrowthMarks,
      BRAND_PHOTOS.smallAndOftenCalendar,
      BRAND_PHOTOS.screenIsARoom,
    ]);
    for (let sessionNumber = 1; sessionNumber <= 16; sessionNumber += 1) {
      assert.equal(courseTexture.has(sessionCover(sessionNumber)), false);
      assert.equal(courseTexture.has(sessionCover(sessionNumber, "il")), false);
    }
  });
});

describe("training card override", () => {
  it("keeps customUrl ahead of the platform still", () => {
    const customUrl = "/custom/steady.jpg";
    assert.equal(customUrl || trainingCover("anger"), customUrl);
    assert.equal("" || trainingCover("anger"), BRAND_PHOTOS.smallAndOftenCalendar);
  });
});
