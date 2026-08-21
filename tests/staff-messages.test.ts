import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  filterStaffMessageRecipients,
  isStaffMessageAudience,
  normalizeStaffMessage,
  staffMessageAudienceNeedsPicks,
  type StaffMessagePerson,
} from "../lib/staff-messages/types";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

function person(
  overrides: Partial<StaffMessagePerson> & Pick<StaffMessagePerson, "id" | "role">
): StaffMessagePerson {
  return {
    name: overrides.name ?? overrides.id,
    email: overrides.email ?? `${overrides.id}@nwa`,
    organization: overrides.organization ?? "Returning Home NWA",
    ...overrides,
  };
}

describe("staff message targeting", () => {
  const people = [
    person({ id: "leader-1", role: "manager", name: "Brenda" }),
    person({ id: "leader-2", role: "manager", name: "Manager 2" }),
    person({ id: "reviewer-1", role: "reviewer", name: "NWA Reviewer" }),
  ];

  it("knows the five Super-admin audiences", () => {
    assert.equal(isStaffMessageAudience("all_leaders"), true);
    assert.equal(isStaffMessageAudience("selected_reviewers"), true);
    assert.equal(isStaffMessageAudience("fathers"), false);
    assert.equal(staffMessageAudienceNeedsPicks("selected_leaders"), true);
    assert.equal(staffMessageAudienceNeedsPicks("all_leaders"), false);
  });

  it("never includes anyone who is not a Leader or Reviewer", () => {
    const mixed = [
      ...people,
      person({ id: "father-1", role: "manager", name: "Should not happen" }),
    ].filter((row) => row.id !== "father-1");
    const all = filterStaffMessageRecipients(people, "all_leaders_and_reviewers", [
      "leader-1",
      "father-1",
    ]);
    assert.deepEqual(
      all.map((row) => row.id).sort(),
      ["leader-1", "leader-2", "reviewer-1"]
    );
    assert.equal(
      filterStaffMessageRecipients(mixed, "all_leaders", []).every(
        (row) => row.role === "manager"
      ),
      true
    );
    assert.deepEqual(
      filterStaffMessageRecipients(people, "selected_leaders", ["leader-2", "reviewer-1"]).map(
        (row) => row.id
      ),
      ["leader-2"]
    );
    assert.deepEqual(
      filterStaffMessageRecipients(people, "selected_reviewers", ["leader-1", "reviewer-1"]).map(
        (row) => row.id
      ),
      ["reviewer-1"]
    );
  });

  it("collapses the note the same way Home updates do", () => {
    assert.equal(normalizeStaffMessage("  Hold   steady.  "), "Hold steady.");
  });
});

describe("staff message portal", () => {
  it("puts the Super-admin desk between Inbox and Visuals", () => {
    const nav = readRepo("components/layout/app-nav.tsx");
    const home = readRepo("app/(admin)/admin/page.tsx");
    const page = readRepo("app/(admin)/admin/messages/page.tsx");
    const migration = readRepo("supabase/migrations/20260821030000_platform_staff_messages.sql");
    const action = readRepo("lib/staff-messages/actions.ts");
    const sql = readRepo("supabase/migrations/20260821030000_platform_staff_messages.sql");

    assert.match(nav, /nav\.messages/);
    assert.match(nav, /\/admin\/messages/);
    assert.ok(nav.lastIndexOf("/admin/support") < nav.lastIndexOf("/admin/messages"));
    assert.ok(nav.lastIndexOf("/admin/messages") < nav.lastIndexOf("/admin/appearance"));
    assert.match(home, /\/admin\/messages/);
    assert.match(home, /Fathers never/);
    assert.match(page, /StaffMessageForm/);
    assert.match(page, /loadStaffMessageDirectory/);
    assert.match(action, /send_platform_staff_message/);
    assert.match(action, /requireRole\("admin"\)/);
    assert.doesNotMatch(action, /role === "father"/);
    assert.match(migration, /platform_staff_messages/);
    assert.match(sql, /recipient_role in \('manager', 'reviewer'\)/);
    assert.match(sql, /internal.is_super_admin/);
    assert.match(sql, /role in \('manager'::public.user_role, 'reviewer'::public.user_role\)/);
  });

  it("shows one dismissible ribbon on Leader and Reviewer desks", () => {
    const ribbon = readRepo("components/staff/staff-message-ribbon.tsx");
    const shell = readRepo("components/layout/role-shell.tsx");
    const manager = readRepo("app/(manager)/layout.tsx");
    const reviewer = readRepo("app/(reviewer)/layout.tsx");
    const father = readRepo("app/(father)/layout.tsx");

    assert.match(ribbon, /dismissStaffMessage/);
    assert.match(ribbon, /staff\.ribbon\.dismiss/);
    assert.match(shell, /banner/);
    assert.match(shell, /border-primary\/30 bg-primary\/10/);
    assert.match(manager, /StaffMessageRibbon/);
    assert.match(reviewer, /StaffMessageRibbon/);
    assert.doesNotMatch(father, /StaffMessageRibbon/);
    assert.doesNotMatch(father, /loadOpenStaffRibbon/);
  });
});
