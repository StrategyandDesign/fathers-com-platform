import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("assessment release RPC", () => {
  it("does not use OUT column names as ON CONFLICT targets", () => {
    const sql = readRepo(
      "supabase/migrations/20260821090000_qualify_assessment_release_conflict.sql"
    );

    assert.match(sql, /on conflict on constraint platform_assessment_releases_pkey/);
    assert.match(
      sql,
      /on conflict on constraint organization_assessment_reviews_group_id_assessment_key_key/
    );
    assert.doesNotMatch(sql, /on conflict \(assessment_key\)/);
    assert.doesNotMatch(sql, /on conflict \(group_id, assessment_key\)/);
    assert.match(sql, /internal\.release_assessment_to_organizations/);
    assert.match(sql, /internal\.seed_group_assessment_reviews/);
  });

  it("keeps the Super-admin banner tied to a failed release write", () => {
    const actions = readRepo("lib/admin/assessment-actions.ts");
    const release = readRepo("lib/admin/assessment-release.ts");

    assert.match(actions, /Unable to update release status\. Please try again\./);
    assert.match(actions, /releaseAssessmentToManagers/);
    assert.match(release, /release_assessment_to_organizations/);
  });
});
