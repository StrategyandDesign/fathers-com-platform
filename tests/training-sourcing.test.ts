import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RIGHTS_DECLINED_ERROR,
  RIGHTS_REQUIRED_ERROR,
  parseSessionOutline,
  sourcedReleaseBlocker,
  splitOutlineLine,
} from "../lib/admin/sourcing";

describe("training sourcing outline", () => {
  it("reads a title and YouTube URL on one line", () => {
    const parsed = splitOutlineLine("Stay present | https://youtu.be/dQw4w9WgXcQ");
    assert.equal(parsed.title, "Stay present");
    assert.equal(parsed.videoUrl, "https://youtu.be/dQw4w9WgXcQ");
  });

  it("attaches a following URL line to the previous title", () => {
    const sessions = parseSessionOutline(
      ["Anger in the house", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "2. Repair", ""].join(
        "\n"
      )
    );
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].title, "Anger in the house");
    assert.equal(sessions[0].videoUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(sessions[1].title, "Repair");
    assert.equal(sessions[1].videoUrl, null);
  });

  it("ignores comment lines and numbered prefixes", () => {
    const sessions = parseSessionOutline(
      ["# notes", "1. First skill — https://youtu.be/dQw4w9WgXcQ"].join("\n")
    );
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].title, "First skill");
  });

  it("does not treat a non-YouTube link as a film", () => {
    const parsed = splitOutlineLine("Talk https://example.com/talk");
    assert.equal(parsed.videoUrl, null);
    assert.match(parsed.title, /Talk/);
  });
});

describe("sourced release rights", () => {
  it("does not block in-house trainings", () => {
    assert.equal(sourcedReleaseBlocker(null), null);
  });

  it("blocks first release until rights are cleared", () => {
    assert.equal(sourcedReleaseBlocker({ rights_status: "inquiry" }), RIGHTS_REQUIRED_ERROR);
    assert.equal(sourcedReleaseBlocker({ rights_status: "pending" }), RIGHTS_REQUIRED_ERROR);
    assert.equal(sourcedReleaseBlocker({ rights_status: "declined" }), RIGHTS_DECLINED_ERROR);
    assert.equal(sourcedReleaseBlocker({ rights_status: "cleared" }), null);
  });
});
