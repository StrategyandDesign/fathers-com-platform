import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { anonymousShareOnByDefault } from "../lib/account/anonymous-share";
import {
  emptyAdminGathering,
  gatheringHomePreview,
  parseAdminGathering,
  sharingInventory,
} from "../lib/admin/gathering-model";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("anonymous share default", () => {
  it("is on for fathers and leaders, off for reviewers and Super-admins", () => {
    assert.equal(anonymousShareOnByDefault("father"), true);
    assert.equal(anonymousShareOnByDefault("manager"), true);
    assert.equal(anonymousShareOnByDefault("reviewer"), false);
    assert.equal(anonymousShareOnByDefault("admin"), false);
    assert.equal(anonymousShareOnByDefault(null), false);
  });
});

describe("Gathering desk preview", () => {
  it("formats sharing inventory for the Super-admin home card", () => {
    const gathering = emptyAdminGathering();
    gathering.fathers.optedIn = 10;
    gathering.fathers.eligible = 10;
    gathering.fathers.ready = true;
    gathering.fathers.sessionsCompleted = 13;
    gathering.managers.optedIn = 6;
    gathering.managers.eligible = 6;
    gathering.managers.ready = true;
    gathering.managers.assignments = 4;
    gathering.managers.certificatesIssued = 1;

    assert.equal(sharingInventory(gathering), 16);
    assert.deepEqual(gatheringHomePreview(gathering), {
      fathersSharing: "10 of 10",
      leadersSharing: "6 of 6",
      reviewersSharing: "0 of 0",
      sessionsCompleted: 13,
      assignments: 4,
      certificatesIssued: 1,
    });
  });

  it("hides father counts until the share set is large enough", () => {
    const parsed = parseAdminGathering({
      min_cohort: 3,
      fathers: { opted_in: 2, eligible: 10, ready: false, sessions_completed: 13 },
      managers: { opted_in: 6, eligible: 6, ready: true, assignments: 4 },
      reviewers: { opted_in: 0, eligible: 5, ready: false },
    });
    assert.equal(parsed.fathers.ready, false);
    assert.equal(parsed.fathers.sessionsCompleted, null);
    assert.equal(parsed.managers.ready, true);
    assert.equal(parsed.managers.assignments, 4);
  });
});

describe("anonymous share wiring", () => {
  it("turns fathers and leaders on in the database and leaves reviewers off", () => {
    const migration = readRepo(
      "supabase/migrations/20260820070000_anonymous_share_default_on.sql"
    );
    assert.match(migration, /apply_default_anonymous_share/);
    assert.match(migration, /profiles_default_anonymous_share/);
    assert.match(migration, /before insert or update of role/);
    assert.match(migration, /'father'::public.user_role, 'manager'::public.user_role/);
    assert.match(migration, /new.share_anonymous_admin := true/);
    assert.match(migration, /new.role = 'admin'::public.user_role/);
    assert.match(migration, /and not share_anonymous_admin/);
    assert.doesNotMatch(migration, /role = 'reviewer'/);
  });

  it("keeps the Account toggle and says fathers and leaders start on", () => {
    const en = readRepo("lib/i18n/messages/en.ts");
    const he = readRepo("lib/i18n/messages/he.ts");
    const toggle = readRepo("components/account/anonymous-share-toggle.tsx");
    const account = readRepo("components/layout/account-view.tsx");

    assert.match(en, /On for you\. Super-admins see anonymous training counts only/);
    assert.match(
      en,
      /On for you\. Super-admins see anonymous counts of assignments, reviews, and certificates/
    );
    assert.match(en, /Off until you turn it on/);
    assert.match(en, /Anonymous sharing is on for fathers and leaders unless they turn it off/);
    assert.match(he, /פועל אצלך/);
    assert.match(toggle, /saveAnonymousShare/);
    assert.match(account, /AnonymousShareToggle/);
    assert.match(account, /shareAnonymousAdmin/);
  });

  it("feeds Super-admin Home and Gathering from the same anonymous counts", () => {
    const home = readRepo("app/(admin)/admin/page.tsx");
    const gathering = readRepo("app/(admin)/admin/gathering/page.tsx");
    const load = readRepo("lib/admin/gathering.ts");
    const actions = readRepo("lib/account/actions.ts");

    assert.match(home, /loadAdminGathering/);
    assert.match(home, /gatheringHomePreview/);
    assert.match(home, /Fathers sharing/);
    assert.match(home, /Leaders sharing/);
    assert.match(home, /On unless they turn it/);
    assert.match(gathering, /on unless they turn/);
    assert.match(gathering, /Fathers and leaders start on/);
    assert.doesNotMatch(gathering, /Super-admins do not turn it on for them/);
    assert.match(load, /admin_anonymous_gathering/);
    assert.match(actions, /share_anonymous_admin/);
    assert.match(actions, /revalidatePath\("\/admin\/gathering"\)/);
  });
});
