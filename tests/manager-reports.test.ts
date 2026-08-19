import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Session, SessionProgress, Training } from "../lib/father/types";
import {
  activityInRange,
  buildManagerReport,
  parseReportSearchParams,
  rowsToCsv,
  summarizeReport,
  trainingStatus,
  type ReportBuildInput,
} from "../lib/manager/reports";
import type { ParticipantRow, TrainingAssignment, TrainingProgress } from "../lib/manager/types";

function training(id: string, title: string): Training {
  return {
    id,
    slug: id,
    title,
    description: null,
    session_count: 2,
    order_index: 1,
  };
}

function session(id: string, trainingId: string): Session {
  return {
    id,
    training_id: trainingId,
    session_number: 1,
    title: id,
    keyline: null,
    video_url: null,
    order_index: 1,
  };
}

function participant(overrides: Partial<ParticipantRow> = {}): ParticipantRow {
  return {
    fatherId: "father-1",
    name: "James",
    avatarUrl: null,
    groupId: "group-1",
    groupName: "Morning cohort",
    joinedAt: "2026-01-01T00:00:00.000Z",
    profileStatus: "not_started",
    profile: null,
    progressLabel: "None assigned",
    lastActivity: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function assignment(overrides: Partial<TrainingAssignment> = {}): TrainingAssignment {
  return {
    id: "asg-1",
    father_id: "father-1",
    training_id: "fundamentals",
    assigned_by: "manager-1",
    assigned_at: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

function progressRow(overrides: Partial<SessionProgress> = {}): SessionProgress {
  return {
    id: "sp-1",
    father_id: "father-1",
    session_id: "s1",
    film_completed: true,
    checkin_completed: true,
    action_completed: true,
    checkin_answers: {},
    action_note: null,
    session_note: null,
    film_seconds: 0,
    status: "completed",
    completed_at: "2026-03-15T00:00:00.000Z",
    ...overrides,
  };
}

function card(overrides: Partial<TrainingProgress> & Pick<TrainingProgress, "training">): TrainingProgress {
  return {
    sessions: [session("s1", overrides.training.id), session("s2", overrides.training.id)],
    completed: 0,
    total: 2,
    assigned: true,
    gated: false,
    certificate: null,
    current: null,
    ...overrides,
  };
}

function input(overrides: Partial<ReportBuildInput> = {}): ReportBuildInput {
  const fundamentals = training("fundamentals", "Fathering Fundamentals");
  const sameTeam = training("same-team", "Same Team");
  return {
    groups: [
      { id: "group-1", name: "Morning cohort" },
      { id: "group-2", name: "Evening cohort" },
    ],
    trainings: [fundamentals, sameTeam],
    participants: [participant()],
    assignments: [assignment()],
    progress: [],
    trainingProgressFor: () => [
      card({ training: fundamentals, assigned: true }),
      card({ training: sameTeam, assigned: false }),
    ],
    ...overrides,
  };
}

describe("manager reports", () => {
  it("emits one row per assigned training, not one concatenated row per man", () => {
    const fundamentals = training("fundamentals", "Fathering Fundamentals");
    const sameTeam = training("same-team", "Same Team");
    const report = buildManagerReport(
      input({
        assignments: [
          assignment(),
          assignment({ id: "asg-2", training_id: "same-team", assigned_at: "2026-02-10T00:00:00.000Z" }),
        ],
        trainingProgressFor: () => [
          card({ training: fundamentals, assigned: true }),
          card({ training: sameTeam, assigned: true }),
        ],
      })
    );

    assert.equal(report.rows.length, 2);
    assert.deepEqual(
      report.rows.map((row) => row.trainingTitle),
      ["Fathering Fundamentals", "Same Team"]
    );
    assert.equal(report.summary.men, 1);
    assert.equal(report.summary.notStarted, 2);
  });

  it("ignores join date when filtering program activity", () => {
    const report = buildManagerReport(input(), {
      groupId: null,
      trainingId: null,
      status: null,
      from: "2026-01-01",
      to: "2026-01-31",
    });

    assert.equal(report.rows.length, 0);
    assert.equal(activityInRange(null, "2026-01-01", "2026-01-31"), false);
    assert.equal(activityInRange("2026-02-01T00:00:00.000Z", "2026-02-01", "2026-02-28"), true);
  });

  it("uses session completion as the training completion date", () => {
    const fundamentals = training("fundamentals", "Fathering Fundamentals");
    const report = buildManagerReport(
      input({
        progress: [
          progressRow({ session_id: "s1", completed_at: "2026-03-10T00:00:00.000Z" }),
          progressRow({
            id: "sp-2",
            session_id: "s2",
            completed_at: "2026-03-20T00:00:00.000Z",
          }),
        ],
        trainingProgressFor: () => [
          card({
            training: fundamentals,
            completed: 2,
            total: 2,
            certificate: {
              id: "c1",
              father_id: "father-1",
              training_id: "fundamentals",
              serial_number: "FC-100",
              issued_at: "2026-03-21T00:00:00.000Z",
              issued_by: "manager-1",
            },
          }),
        ],
      })
    );

    assert.equal(report.rows[0]?.completionStatus, "completed");
    assert.equal(report.rows[0]?.completedAt, "2026-03-20T00:00:00.000Z");
    assert.equal(report.rows[0]?.certificateSerial, "FC-100");
    assert.equal(trainingStatus(undefined), "not_started");
  });

  it("keeps another manager's group out of the export", () => {
    const report = buildManagerReport(input(), {
      groupId: "someone-elses-group",
      trainingId: null,
      status: null,
      from: null,
      to: null,
    });

    assert.equal(report.rows.length, 0);
    assert.equal(report.error, "That group is not yours.");
  });

  it("filters a multi-group manager to one of their own cohorts", () => {
    const report = buildManagerReport(
      input({
        participants: [
          participant(),
          participant({
            fatherId: "father-2",
            name: "Marcus",
            groupId: "group-2",
            groupName: "Evening cohort",
          }),
        ],
        assignments: [
          assignment(),
          assignment({ id: "asg-2", father_id: "father-2", assigned_at: "2026-02-12T00:00:00.000Z" }),
        ],
        trainingProgressFor: () => [
          card({
            training: training("fundamentals", "Fathering Fundamentals"),
            assigned: true,
          }),
        ],
      }),
      {
        groupId: "group-2",
        trainingId: null,
        status: null,
        from: null,
        to: null,
      }
    );

    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0]?.name, "Marcus");
    assert.equal(report.organization, "Evening cohort");
  });

  it("writes a CSV a director can hand up, with definitions and per-training columns", () => {
    const csv = rowsToCsv(
      buildManagerReport(
        input({
          progress: [progressRow({ film_completed: false, checkin_completed: false, action_completed: false, status: "in_progress", completed_at: null })],
        })
      ).rows,
      "en",
      {
        generatedAt: "2026-08-19T16:00:00.000Z",
        organization: "Morning cohort",
      }
    );

    assert.match(csv, /# Fathers.com participation report/);
    assert.match(csv, /# Generated: 2026-08-19T16:00:00.000Z/);
    assert.match(csv, /Participant ID/);
    assert.match(csv, /Assigned on/);
    assert.match(csv, /Completed on/);
    assert.match(csv, /Join date is not counted/);
    assert.match(csv, /father-1/);
    assert.match(csv, /Fathering Fundamentals/);
    assert.equal(summarizeReport(buildManagerReport(input()).rows).notStarted, 1);
  });

  it("parses the optional group filter", () => {
    const parsed = parseReportSearchParams({
      group_id: "group-2",
      status: "completed",
      from: "2026-03-01",
      to: "2026-03-31",
    });
    assert.equal(parsed.filters.groupId, "group-2");
    assert.equal(parsed.filters.status, "completed");
    assert.equal(parsed.error, undefined);
  });
});
