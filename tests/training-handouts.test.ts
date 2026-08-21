import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  TRAINING_HANDOUTS_BUCKET,
  TRAINING_HANDOUT_MAX_BYTES,
  TRAINING_HANDOUT_MAX_COUNT,
} from "../lib/storage";
import {
  isPdfBytes,
  sanitizeHandoutName,
  trainingHandoutHref,
  trainingHandoutPath,
} from "../lib/training-handouts/names";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("training handouts", () => {
  it("accepts PDFs only and keeps them small", () => {
    assert.equal(TRAINING_HANDOUTS_BUCKET, "training-handouts");
    assert.equal(TRAINING_HANDOUT_MAX_BYTES, 5 * 1024 * 1024);
    assert.equal(TRAINING_HANDOUT_MAX_COUNT, 3);
    assert.equal(isPdfBytes(Buffer.from("%PDF-1.7\n")), true);
    assert.equal(isPdfBytes(Buffer.from("not a pdf")), false);

    const migration = readRepo("supabase/migrations/20260820050000_training_handouts.sql");
    const desk = readRepo("components/admin/training-handout-desk.tsx");
    assert.match(migration, /file_size_limit/);
    assert.match(migration, /5242880/);
    assert.match(migration, /application\/pdf/);
    assert.match(desk, /application\/pdf/);
    assert.match(desk, /5 MB/);
    assert.match(desk, /up to 3/);
  });

  it("keeps handout names short and storage paths scoped", () => {
    assert.equal(sanitizeHandoutName("Week 1 / Guide.pdf"), "Guide.pdf");
    assert.equal(sanitizeHandoutName("Week 1 Guide.pdf"), "Week 1 Guide.pdf");
    assert.equal(sanitizeHandoutName("no-extension"), "no-extension.pdf");
    assert.equal(sanitizeHandoutName(""), "handout.pdf");
    assert.ok(sanitizeHandoutName(`${"a".repeat(100)}.pdf`).length <= 80);
    assert.equal(trainingHandoutPath("train-1", "hand-2"), "train-1/hand-2.pdf");
    assert.equal(
      trainingHandoutHref("train-1", "hand-2"),
      "/api/trainings/train-1/handouts/hand-2"
    );
  });

  it("lets Super-admin attach PDFs on the training desk, not on Org Photos", () => {
    const edit = readRepo("app/(admin)/admin/trainings/[id]/page.tsx");
    const create = readRepo("app/(admin)/admin/trainings/new/page.tsx");
    const desk = readRepo("components/admin/training-handout-desk.tsx");
    const actions = readRepo("lib/training-handouts/actions.ts");
    const photos = readRepo("app/(manager)/manager/account/photos/page.tsx");
    const development = readRepo("lib/admin/development.ts");

    assert.match(edit, /TrainingHandoutDesk/);
    assert.match(edit, /loadTrainingHandouts/);
    assert.match(edit, /overview_video_url/);
    assert.ok(
      edit.indexOf('name="overview_video_url"') < edit.indexOf("<TrainingHandoutDesk")
    );
    assert.doesNotMatch(create, /TrainingHandoutDesk/);
    assert.match(create, /5 MB each, up to 3/);
    assert.doesNotMatch(photos, /training-handouts|TrainingHandoutDesk/);
    assert.match(desk, /uploadTrainingHandout/);
    assert.match(desk, /removeTrainingHandout/);
    assert.match(desk, /type="button"/);
    assert.match(actions, /requireRole\("admin"\)/);
    assert.match(actions, /TRAINING_HANDOUT_MAX_COUNT/);
    assert.match(actions, /isPdfBytes/);
    assert.doesNotMatch(development, /handout/);
  });

  it("shows a quiet PDF on the father training only when a handout exists", () => {
    const overview = readRepo("app/(father)/father/trainings/[trainingId]/page.tsx");
    const catalog = readRepo("app/(father)/father/trainings/page.tsx");
    const card = readRepo("components/father/training-catalog-card.tsx");
    const links = readRepo("components/father/training-handout-links.tsx");
    const session = readRepo("app/(father)/father/sessions/[sessionId]/page.tsx");
    const stage = readRepo("app/(admin)/admin/trainings/[id]/stage/overview/page.tsx");

    assert.match(overview, /loadTrainingHandouts/);
    assert.match(overview, /layout="card"/);
    assert.match(catalog, /handoutsByTraining/);
    assert.match(card, /TrainingHandoutLinks/);
    assert.match(session, /TrainingHandoutLinks/);
    assert.match(stage, /layout="card"/);
    assert.match(links, /if \(handouts\.length === 0\) return null/);
    assert.doesNotMatch(card, /leader_summary/);
    assert.doesNotMatch(catalog, /leader_summary/);
  });

  it("gives leaders a PDF section under Training Summary only when one exists", () => {
    const page = readRepo("app/(manager)/manager/reviews/[trainingId]/page.tsx");
    const summary = page.indexOf('t("manager.reviewDetail.summary")');
    const handouts = page.indexOf('t("manager.reviewDetail.handouts")');
    const sessions = page.indexOf('t("manager.reviewDetail.sessions")');

    assert.ok(summary > 0);
    assert.ok(handouts > summary);
    assert.ok(sessions > handouts);
    assert.match(page, /handouts\.length > 0/);
    assert.match(page, /TrainingHandoutLinks/);
  });

  it("keeps PDF downloads signed in and off a public bucket", () => {
    const route = readRepo(
      "app/api/trainings/[trainingId]/handouts/[handoutId]/route.ts"
    );
    const migration = readRepo("supabase/migrations/20260820050000_training_handouts.sql");

    assert.match(route, /getAuthContext/);
    assert.match(route, /inline; filename=/);
    assert.match(route, /application\/pdf/);
    assert.match(migration, /'training-handouts',\s*'training-handouts',\s*false/s);
    assert.match(migration, /is_super_admin\(\)/);
    assert.match(migration, /training_handouts_insert/);
  });
});
