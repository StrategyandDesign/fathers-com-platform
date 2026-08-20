import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { continueHref } from "../lib/father/types";
import {
  PRACTICE_ROOT,
  isLeaderSelfRow,
  practiceContinueHref,
  walkPathsFor,
} from "../lib/practice/paths";

describe("leader practice paths", () => {
  it("sends Leaders to the practice walk, not the father routes", () => {
    const paths = walkPathsFor("manager");
    assert.equal(paths.home, PRACTICE_ROOT);
    assert.equal(paths.session("s1"), `${PRACTICE_ROOT}/sessions/s1`);
    assert.equal(paths.checkin("s1"), `${PRACTICE_ROOT}/sessions/s1/checkin`);
    assert.equal(paths.action("s1"), `${PRACTICE_ROOT}/sessions/s1/action`);
    assert.equal(paths.profileTake, `${PRACTICE_ROOT}/profile/take`);
    assert.equal(paths.profilePart, `${PRACTICE_ROOT}/profile/part`);
    assert.equal(paths.assessment("a1", 2), `${PRACTICE_ROOT}/assessments/a1?q=2`);
  });

  it("keeps father continue links on /father", () => {
    assert.equal(continueHref("s1", null), "/father/sessions/s1");
    assert.equal(
      continueHref("s1", {
        film_completed: true,
        checkin_completed: false,
        action_completed: false,
      }),
      "/father/sessions/s1/checkin"
    );
  });

  it("resumes Leader practice on the same Film → Check-in → Action steps", () => {
    assert.equal(practiceContinueHref("s1", null), `${PRACTICE_ROOT}/sessions/s1`);
    assert.equal(
      practiceContinueHref("s1", {
        film_completed: true,
        checkin_completed: true,
        action_completed: false,
      }),
      `${PRACTICE_ROOT}/sessions/s1/action`
    );
  });

  it("treats a Leader’s own assessment row as self-work, not roster work", () => {
    assert.equal(isLeaderSelfRow("leader-1", "leader-1"), true);
    assert.equal(isLeaderSelfRow("father-1", "leader-1"), false);
  });
});
