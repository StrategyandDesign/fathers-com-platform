import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isAuthPath } from "../lib/auth/roles";
import {
  createManagerInviteToken,
  hashManagerInviteToken,
  isInviteEmail,
  isManagerInviteOpen,
  managerInviteExpiresAt,
  managerInviteStatus,
  managerJoinHref,
  normalizeInviteEmail,
} from "../lib/manager/invite";
import {
  isManagerStartPath,
  shouldShowManagerOnboarding,
} from "../lib/manager/onboarding";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("leader invite tokens", () => {
  it("hashes the join token and keeps the raw value off the row", () => {
    const { token, hash } = createManagerInviteToken();
    assert.equal(hash, hashManagerInviteToken(token));
    assert.notEqual(token, hash);
    assert.equal(hash.length, 64);
  });

  it("closes accepted and expired invites", () => {
    const now = new Date("2026-08-20T12:00:00Z");
    assert.equal(
      isManagerInviteOpen({ acceptedAt: null, expiresAt: "2026-08-21T12:00:00Z" }, now),
      true
    );
    assert.equal(
      isManagerInviteOpen({ acceptedAt: "2026-08-19T12:00:00Z", expiresAt: "2026-08-21T12:00:00Z" }, now),
      false
    );
    assert.equal(
      isManagerInviteOpen({ acceptedAt: null, expiresAt: "2026-08-19T12:00:00Z" }, now),
      false
    );
    assert.ok(managerInviteExpiresAt(now).getTime() > now.getTime());
  });

  it("builds a join URL and normalizes email", () => {
    assert.equal(normalizeInviteEmail("  Sam@Org.org "), "sam@org.org");
    assert.equal(isInviteEmail("sam@org.org"), true);
    assert.equal(isInviteEmail("not-an-email"), false);
    assert.equal(
      managerJoinHref("abc", "https://app.fathers.com"),
      "https://app.fathers.com/join/leader?token=abc"
    );
    assert.equal(
      managerInviteStatus({
        id: "1",
        email: "sam@org.org",
        fullName: null,
        organizationName: "NWA",
        groupId: null,
        acceptedAt: null,
        expiresAt: "2026-08-21T12:00:00Z",
        createdAt: "2026-08-20T12:00:00Z",
      }),
      "pending"
    );
  });
});

describe("leader first-run", () => {
  it("shows the desk instruction only until it is finished", () => {
    assert.equal(shouldShowManagerOnboarding(null), true);
    assert.equal(shouldShowManagerOnboarding("2026-08-20T12:00:00Z"), false);
    assert.equal(isManagerStartPath("/manager/start"), true);
    assert.equal(isManagerStartPath("/manager"), false);
  });

  it("keeps /join/leader on the public auth path", () => {
    assert.equal(isAuthPath("/join/leader"), true);
    assert.equal(isAuthPath("/signup"), true);
    assert.equal(isAuthPath("/manager/start"), false);
  });
});

describe("leader onboarding wiring", () => {
  it("connects invite, join, inbox, and first-run pages", () => {
    const orgNew = readRepo("app/(admin)/admin/organizations/new/page.tsx");
    const join = readRepo("app/(auth)/join/leader/page.tsx");
    const start = readRepo("app/(manager)/manager/start/page.tsx");
    const layout = readRepo("app/(manager)/layout.tsx");
    const inbox = readRepo("components/admin/inbox-tabs.tsx");

    assert.match(orgNew, /provisionOrganization/);
    assert.match(join, /joinAsLeader/);
    assert.match(start, /finishManagerOnboarding/);
    assert.match(layout, /gateManagerOnboarding/);
    assert.match(inbox, /admin\/support\/leaders/);
  });
});
