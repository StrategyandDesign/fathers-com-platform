import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { LEADER_SUMMARY_MAX } from "../lib/admin/development";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("training summary", () => {
  it("caps the leader summary at 4000 characters", () => {
    assert.equal(LEADER_SUMMARY_MAX, 4000);
  });

  it("persists leader_summary on create and update", () => {
    const source = readRepo("lib/admin/actions.ts");
    const createStart = source.indexOf("export async function createTraining");
    const updateStart = source.indexOf("export async function updateTraining");
    const publishedStart = source.indexOf("export async function setTrainingPublished");
    const create = source.slice(createStart, updateStart);
    const update = source.slice(updateStart, publishedStart);
    assert.match(create, /"leader_summary"/);
    assert.match(create, /leader_summary: leaderSummary \|\| null/);
    assert.match(update, /"leader_summary"/);
    assert.match(update, /leader_summary: leaderSummary \|\| null/);
  });

  it("mirrors Training Summary on Super-admin create and edit", () => {
    const createPage = readRepo("app/(admin)/admin/trainings/new/page.tsx");
    const editPage = readRepo("app/(admin)/admin/trainings/[id]/page.tsx");
    for (const source of [createPage, editPage]) {
      assert.match(source, />Training Summary</);
      assert.match(source, /name="leader_summary"/);
      assert.match(
        source,
        /This is what the leader \(Org Manager\) reads before the session/
      );
    }
  });

  it("shows Training Summary below the title on the manager view", () => {
    const page = readRepo("app/(manager)/manager/reviews/[trainingId]/page.tsx");
    const title = page.indexOf("{training.title}");
    const summary = page.indexOf('t("manager.reviewDetail.summary")');
    const sessions = page.indexOf('t("manager.reviewDetail.sessions")');
    assert.ok(title > 0);
    assert.ok(summary > title);
    assert.ok(sessions > summary);
    assert.match(page, /training\.leader_summary/);
    assert.doesNotMatch(page, /assignFromTrainings/);
  });

  it("does not put the summary on father catalog cards", () => {
    const card = readRepo("components/father/training-catalog-card.tsx");
    assert.doesNotMatch(card, /leader_summary/);
  });
});
