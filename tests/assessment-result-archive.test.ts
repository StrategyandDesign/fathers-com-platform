import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { familyFortressInstrument } from "../lib/assessments/instruments/family-fortress";
import { listInstrumentDesignations } from "../lib/assessments/instrument";
import {
  collectFatherAssessmentResults,
  openAssessmentWork,
  splitFeaturedAndArchive,
} from "../lib/assessments/result-archive";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("father assessment result archive", () => {
  it("puts the newest completed result first and drops Keystone below it", () => {
    const results = collectFatherAssessmentResults({
      keystone: {
        takenAt: "2026-08-10T12:00:00.000Z",
        determination: "Involvement",
        edge: "Presence",
      },
      firstParty: [
        {
          key: "family-fortress",
          title: "The Family Fortress Keystone Assessment",
          questionCount: 30,
          maxTotal: 120,
          attempt: {
            completedAt: "2026-08-21T05:50:00.000Z",
            outcomeLabel: "Solid Walls",
            outcomeDescription: "Core elements are in place.",
            total: 97,
          },
        },
        {
          key: "steady-presence",
          title: "The Steady Presence Keystone Assessment",
          questionCount: 30,
          maxTotal: 120,
          attempt: {
            completedAt: null,
            outcomeLabel: null,
            outcomeDescription: null,
            total: null,
          },
        },
      ],
    });

    assert.equal(results.length, 2);
    assert.equal(results[0]?.id, "family-fortress");
    assert.equal(results[0]?.rewardLabel, "Solid Walls");
    assert.equal(results[0]?.completedAt, "2026-08-21T05:50:00.000Z");
    assert.equal(results[0]?.score?.value, 97);
    assert.equal(results[1]?.kind, "keystone");

    const { featured, archive } = splitFeaturedAndArchive(results);
    assert.equal(featured?.id, "family-fortress");
    assert.deepEqual(
      archive.map((item) => item.kind),
      ["keystone"]
    );
  });

  it("keeps the same newest-first order for every future catalog assessment", () => {
    const results = collectFatherAssessmentResults({
      keystone: {
        takenAt: "2026-07-01T12:00:00.000Z",
        determination: "Consistency",
      },
      firstParty: [
        {
          key: "legacy-architect",
          title: "The Legacy Architect Keystone Assessment",
          questionCount: 30,
          maxTotal: 120,
          attempt: {
            completedAt: "2026-08-01T09:00:00.000Z",
            outcomeLabel: "Cornerstone Builder",
            outcomeDescription: null,
            total: 90,
          },
        },
        {
          key: "future-household",
          title: "A future household assessment",
          questionCount: 20,
          maxTotal: 80,
          attempt: {
            completedAt: "2026-08-20T18:00:00.000Z",
            outcomeLabel: "Steady Roof",
            outcomeDescription: null,
            total: 71,
          },
        },
      ],
      assignments: [
        {
          assignment: {
            id: "custom-1",
            status: "completed",
            completed_at: "2026-08-15T10:00:00.000Z",
          },
          assessment: { title: "Leader check-in" },
        },
      ],
    });

    assert.deepEqual(
      results.map((item) => item.id),
      ["future-household", "custom-1", "legacy-architect", "keystone"]
    );
  });

  it("leaves unfinished assessments in the open work list", () => {
    const open = openAssessmentWork({
      firstParty: [
        {
          key: "family-fortress",
          title: "The Family Fortress Keystone Assessment",
          description: "",
          questionCount: 30,
          maxTotal: 120,
          canStart: true,
          attempt: {
            userId: "f1",
            assessmentKey: "family-fortress",
            answers: {},
            total: 97,
            outcomeKey: "fortress",
            outcomeLabel: "Solid Walls",
            outcomeDescription: null,
            startedAt: "2026-08-21T05:00:00.000Z",
            completedAt: "2026-08-21T05:50:00.000Z",
          },
        },
        {
          key: "steady-presence",
          title: "The Steady Presence Keystone Assessment",
          description: "",
          questionCount: 30,
          maxTotal: 120,
          canStart: true,
          attempt: null,
        },
      ],
      assignments: [
        {
          assignment: {
            id: "open-1",
            assessment_id: "a1",
            father_id: "f1",
            assigned_by: null,
            status: "in_progress",
            started_at: "2026-08-21T04:00:00.000Z",
            completed_at: null,
            created_at: "2026-08-21T04:00:00.000Z",
          },
          assessment: {
            id: "a1",
            manager_id: "m1",
            title: "Open notes",
            description: null,
            created_at: "2026-08-21T04:00:00.000Z",
            updated_at: "2026-08-21T04:00:00.000Z",
          },
          questionCount: 2,
          answeredCount: 1,
        },
        {
          assignment: {
            id: "done-1",
            assessment_id: "a2",
            father_id: "f1",
            assigned_by: null,
            status: "completed",
            started_at: "2026-08-20T04:00:00.000Z",
            completed_at: "2026-08-20T05:00:00.000Z",
            created_at: "2026-08-20T04:00:00.000Z",
          },
          assessment: {
            id: "a2",
            manager_id: "m1",
            title: "Done notes",
            description: null,
            created_at: "2026-08-20T04:00:00.000Z",
            updated_at: "2026-08-20T05:00:00.000Z",
          },
          questionCount: 2,
          answeredCount: 2,
        },
      ],
    });

    assert.deepEqual(
      open.firstParty.map((item) => item.key),
      ["steady-presence"]
    );
    assert.deepEqual(
      open.assignments.map((item) => item.assignment.id),
      ["open-1"]
    );
  });

  it("lists Family Fortress designations from lowest standing to the top reward", () => {
    assert.deepEqual(listInstrumentDesignations(familyFortressInstrument), [
      "Blueprint Stage",
      "Rising Foundation",
      "Solid Walls",
      "Keystone Fortress",
    ]);
  });

  it("returns fathers to Assessments and keeps newest results on that tab", () => {
    const page = readRepo("app/(father)/father/assessments/page.tsx");
    const player = readRepo("components/assessments/choice-assessment-player.tsx");
    const english = readRepo("lib/i18n/messages/en.ts");

    assert.match(page, /collectFatherAssessmentResults/);
    assert.match(page, /splitFeaturedAndArchive/);
    assert.match(page, /EarlierAssessmentResults/);
    assert.match(player, /returnToAssessments/);
    assert.match(player, /youEarned/);
    assert.match(player, /designationScale/);
    assert.doesNotMatch(player, /copyResults/);
    assert.match(english, /Return to Assessments/);
    assert.doesNotMatch(english, /Copy results/);
  });
});
