import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  OUTLINE_SESSION_MAX,
  RIGHTS_DECLINED_ERROR,
  RIGHTS_REQUIRED_ERROR,
  countSessionOutline,
  intakeQueueCounts,
  intakeQueueLine,
  outlineSessionWarning,
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

  it("accepts twenty sessions and only warns when the outline is longer", () => {
    const twenty = Array.from({ length: 20 }, (_, index) => `Session ${index + 1}`).join("\n");
    const twentyOne = Array.from({ length: 21 }, (_, index) => `Session ${index + 1}`).join("\n");
    assert.equal(OUTLINE_SESSION_MAX, 20);
    assert.equal(countSessionOutline(twenty), 20);
    assert.equal(parseSessionOutline(twenty).length, 20);
    assert.equal(outlineSessionWarning(20), null);
    assert.equal(countSessionOutline(twentyOne), 21);
    assert.equal(parseSessionOutline(twentyOne).length, 20);
    assert.match(outlineSessionWarning(21) ?? "", /split the rest/i);
    assert.doesNotMatch(outlineSessionWarning(21) ?? "", /\b20\b|twenty/i);
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

describe("bring-in queue", () => {
  it("counts clearance, sandbox, and released on one line", () => {
    const counts = intakeQueueCounts([
      { status: "open", rightsStatus: "inquiry" },
      { status: "drafting", rightsStatus: "pending" },
      { status: "drafting", rightsStatus: "cleared" },
      { status: "released", rightsStatus: "cleared" },
      { status: "archived", rightsStatus: "cleared" },
      { status: "open", rightsStatus: "declined" },
    ]);
    assert.deepEqual(counts, {
      waitingOnClearance: 2,
      inTheSandbox: 1,
      released: 1,
    });
    assert.equal(intakeQueueLine(counts), "2 waiting on clearance · 1 in the sandbox · 1 released");
    assert.equal(intakeQueueLine(intakeQueueCounts([])), "No intakes in flight.");
  });

  it("prints the queue on the Bring-in list", () => {
    const page = readFileSync(
      fileURLToPath(new URL("../app/(admin)/admin/trainings/sources/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(page, /intakeQueueLine/);
    assert.doesNotMatch(page, /15 short sessions|20 sessions|up to \d+/i);
  });

  it("does not advertise the outline session allowance", () => {
    const field = readFileSync(
      fileURLToPath(new URL("../components/admin/session-outline-field.tsx", import.meta.url)),
      "utf8"
    );
    const intake = readFileSync(
      fileURLToPath(new URL("../app/(admin)/admin/trainings/intakes/[id]/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(field, /of \{OUTLINE_SESSION_MAX\}|short sessions/);
    assert.doesNotMatch(intake, /of \$\{OUTLINE_SESSION_MAX\}/);
  });
});
