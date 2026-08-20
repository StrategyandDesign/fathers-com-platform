import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { en } from "../lib/i18n/messages/en";
import { he } from "../lib/i18n/messages/he";
import {
  PROFILE_QUESTION_COUNT,
  PROFILE_QUESTIONS,
  PROFILE_SECTION_COUNT,
  PROFILE_SECTION_SIZE,
  isProfileSectionEnd,
  isProfileSectionStart,
  partsLeftAfterSection,
  profileSectionForQuestion,
} from "../lib/profile/questions";
import { isKeystoneRoomPath } from "../lib/profile/room";
import { suggestKeystoneTraining } from "../lib/profile/suggest-training";

function walkStrings(value: unknown, path: string, hits: Array<{ path: string; text: string }>) {
  if (typeof value === "string") {
    hits.push({ path, text: value });
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    walkStrings(child, path ? `${path}.${key}` : key, hits);
  }
}

const FORBIDDEN = [
  /\b128\b/,
  /Question \{n\} of/i,
  /twenty minutes/i,
  /8 minutes/i,
  /Congratulations/i,
  /You did it/i,
  /Great job/i,
  /Assessment complete/i,
  /evidence-based/i,
  /deployment/i,
  /battle buddy/i,
  /\bunit\b/i,
];

describe("Keystone completion copy", () => {
  it("keeps father Keystone strings free of length theater and praise", () => {
    const hits: Array<{ path: string; text: string }> = [];
    walkStrings(en.father.profile, "father.profile", hits);
    walkStrings(he.father.profile, "father.profile", hits);
    walkStrings(
      {
        takeProfile: en.father.home.takeProfile,
        continueProfile: en.father.home.continueProfile,
        profileReminder: en.father.home.profileReminder,
        takeProfileTitle: en.father.home.takeProfileTitle,
        takeProfileBody: en.father.home.takeProfileBody,
      },
      "father.home",
      hits
    );

    const bad = hits.filter((row) => FORBIDDEN.some((pattern) => pattern.test(row.text)));
    assert.deepEqual(
      bad.map((row) => `${row.path}: ${row.text}`),
      []
    );
  });

  it("names the start as a part, not a test", () => {
    assert.equal(en.father.profile.takeCta, "Start this part");
    assert.equal(en.father.profile.takeHint, "One part. You can stop and come back.");
    assert.equal(en.father.profile.retake, "Start again");
    assert.equal(en.father.profile.resultsIn, "It’s in.");
    assert.match(en.father.profile.resultsComplete, /Keystone\. \{date\}/);
    assert.equal(en.father.profile.continueRetake, "Continue the new Assessment");
  });
});

describe("Keystone parts", () => {
  it("does not change item count, order, or the first-part opener", () => {
    assert.equal(PROFILE_QUESTION_COUNT, 128);
    assert.equal(PROFILE_SECTION_COUNT, 4);
    assert.equal(PROFILE_SECTION_SIZE, 32);
    assert.equal(PROFILE_QUESTIONS.length, 128);
    assert.match(PROFILE_QUESTIONS[0].text, /most weeks/i);
    assert.equal(isProfileSectionStart(1), true);
    assert.equal(isProfileSectionEnd(32), true);
    assert.equal(isProfileSectionEnd(128), true);
    assert.equal(isProfileSectionEnd(33), false);
    assert.equal(profileSectionForQuestion(33).index, 2);
    assert.equal(partsLeftAfterSection(1), 3);
    assert.equal(partsLeftAfterSection(3), 1);
  });
});

describe("Keystone room chrome", () => {
  it("treats the player, part close, and results as the room", () => {
    assert.equal(isKeystoneRoomPath("/father/profile/take"), true);
    assert.equal(isKeystoneRoomPath("/father/profile/take?q=12"), true);
    assert.equal(isKeystoneRoomPath("/father/profile/part"), true);
    assert.equal(isKeystoneRoomPath("/father/profile/results"), true);
    assert.equal(isKeystoneRoomPath("/manager/practice/profile/take"), true);
    assert.equal(isKeystoneRoomPath("/father/profile"), false);
    assert.equal(isKeystoneRoomPath("/father/assessments"), false);
    assert.equal(isKeystoneRoomPath("/father/trainings"), false);
  });
});

describe("Keystone complementary training", () => {
  const catalog = [
    { id: "ff", slug: "fundamentals", title: "Fathering Fundamentals" },
    { id: "ch", slug: "coming-home-present", title: "Coming Home Present" },
    { id: "st", slug: "steady-under-pressure", title: "Steady Under Pressure" },
  ];

  it("points at one visible training and omits when the catalog is empty", () => {
    assert.equal(suggestKeystoneTraining("Come home present", catalog)?.id, "ch");
    assert.equal(suggestKeystoneTraining("Stay steady", catalog)?.id, "st");
    assert.equal(suggestKeystoneTraining("Repair first", catalog)?.id, "ff");
    assert.equal(suggestKeystoneTraining("presence", catalog)?.id, "ch");
    assert.equal(suggestKeystoneTraining("Come home present", []), null);
  });

  it("does not invent a title outside the catalog he can see", () => {
    const onlyFundamentals = [catalog[0]];
    assert.equal(suggestKeystoneTraining("Come home present", onlyFundamentals)?.title, "Fathering Fundamentals");
  });
});
