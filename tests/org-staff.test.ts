import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isCohortNoteVisible } from "../lib/cohort-note/types";
import {
  activityCopyKey,
  canRemoveStaff,
  formatLeaderNames,
  staffRoleMatchesProfile,
  visibleCohortNotes,
} from "../lib/org-staff/types";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("organization staff rules", () => {
  it("keeps the last leader on the organization", () => {
    assert.equal(
      canRemoveStaff({ targetId: "a", targetRole: "manager", managerCount: 1 }),
      false
    );
    assert.equal(
      canRemoveStaff({ targetId: "a", targetRole: "manager", managerCount: 2 }),
      true
    );
    assert.equal(
      canRemoveStaff({ targetId: "a", targetRole: "reviewer", managerCount: 1 }),
      true
    );
  });

  it("requires the global role to match the org seat", () => {
    assert.equal(staffRoleMatchesProfile("manager", "manager"), true);
    assert.equal(staffRoleMatchesProfile("reviewer", "reviewer"), true);
    assert.equal(staffRoleMatchesProfile("manager", "reviewer"), false);
    assert.equal(staffRoleMatchesProfile("reviewer", "father"), false);
  });

  it("joins leader names for the father home line", () => {
    assert.equal(formatLeaderNames(["Brenda"]), "Brenda");
    assert.equal(formatLeaderNames(["Brenda", "James"]), "Brenda and James");
    assert.equal(formatLeaderNames(["Brenda", "James", "Micah"]), "Brenda, James, and Micah");
  });
});

describe("shared desk record", () => {
  it("maps each recorded action to a short copy key", () => {
    assert.equal(activityCopyKey("note_posted"), "manager.dashboard.activityNotePosted");
    assert.equal(activityCopyKey("training_assigned"), "manager.dashboard.activityTrainingAssigned");
    assert.equal(activityCopyKey("staff_added"), "manager.dashboard.activityStaffAdded");
    assert.equal(activityCopyKey("mystery"), "manager.dashboard.activityUnknown");
  });

  it("writes an append-only activity row from manager actions", () => {
    const actions = readRepo("lib/manager/actions.ts");
    assert.match(actions, /recordOrganizationActivity/);
    assert.match(actions, /training_assigned/);
    assert.match(actions, /certificate_issued/);
    assert.match(actions, /participation_set/);
    const reviews = readRepo("lib/manager/review-actions.ts");
    assert.match(reviews, /review_accepted/);
    assert.match(reviews, /review_declined/);
    const nudges = readRepo("lib/manager/nudge-panel-actions.ts");
    assert.match(nudges, /nudge_sent/);
  });
});

describe("stacked leader notes", () => {
  it("keeps every visible leader note, newest first", () => {
    const stack = visibleCohortNotes(
      [
        { id: "old", updatedAt: "2026-08-18T12:00:00.000Z", dismissedAt: null },
        { id: "new", updatedAt: "2026-08-19T12:00:00.000Z", dismissedAt: null },
        {
          id: "hidden",
          updatedAt: "2026-08-18T08:00:00.000Z",
          dismissedAt: "2026-08-18T09:00:00.000Z",
        },
      ],
      isCohortNoteVisible
    );
    assert.deepEqual(
      stack.map((row) => row.id),
      ["new", "old"]
    );
  });

  it("shows a dismissed note again after that leader replaces it", () => {
    const stack = visibleCohortNotes(
      [
        {
          id: "brenda",
          updatedAt: "2026-08-19T15:00:00.000Z",
          dismissedAt: "2026-08-19T12:00:00.000Z",
        },
      ],
      isCohortNoteVisible
    );
    assert.equal(stack.length, 1);
    assert.equal(stack[0].id, "brenda");
  });

  it("posts and clears only the acting leader’s note", () => {
    const actions = readRepo("lib/cohort-note/actions.ts");
    assert.match(actions, /onConflict: "group_id,author_id"/);
    assert.match(actions, /\.eq\("author_id", user\.id\)/);
    assert.match(actions, /isManagerOfGroup/);
    assert.match(actions, /onConflict: "note_id,father_id"/);
  });
});

describe("staff wiring", () => {
  it("loads manager groups from organization staff, not only listed owner", () => {
    const membership = readRepo("lib/org-staff/membership.ts");
    assert.match(membership, /organization_staff/);
    assert.match(membership, /loadGroupsForManager/);
    const data = readRepo("lib/manager/data.ts");
    assert.match(data, /loadGroupsForManager/);
    const reviews = readRepo("lib/manager/reviews.ts");
    assert.match(reviews, /loadGroupsForManager/);
    const photos = readRepo("lib/org-photos/actions.ts");
    assert.match(photos, /isManagerOfGroup/);
    const notes = readRepo("lib/cohort-note/actions.ts");
    assert.match(notes, /isManagerOfGroup/);
  });

  it("lets a second leader join an existing organization", () => {
    const join = readRepo("lib/auth/leader-join.ts");
    assert.match(join, /invite.groupId/);
    assert.match(join, /organization_staff/);
    assert.match(join, /staff_role: "manager"/);
  });

  it("keeps the schema guards in the staff migration", () => {
    const sql = readRepo("supabase/migrations/20260821010000_organization_staff.sql");
    assert.match(sql, /create table if not exists public.organization_staff/);
    assert.match(sql, /create table if not exists public.organization_activity/);
    assert.match(sql, /Keep at least one leader on the organization/);
    assert.match(sql, /internal.is_manager_of_group/);
    assert.match(sql, /internal.is_reviewer_of_group/);
    assert.match(sql, /organization_cohort_notes_group_author_key/);
    assert.match(sql, /fanout_manager_notification/);
    assert.match(sql, /Reassign their organizations first/);
  });
});
