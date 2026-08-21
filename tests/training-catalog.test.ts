import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("training catalog decisions", () => {
  it("keeps include, decline, and view on one row", () => {
    const catalog = readRepo("components/manager/training-catalog.tsx");
    assert.match(catalog, /flex flex-row flex-wrap items-center gap-2/);
    assert.match(catalog, /CatalogDecisionButtons/);
    assert.match(catalog, /manager\.trainings\.viewTraining/);
    assert.doesNotMatch(catalog, /StatusMark/);
  });

  it("does not keep a Waiting on you queue on Trainings", () => {
    const page = readRepo("app/(manager)/manager/trainings/page.tsx");
    assert.match(page, /TrainingCatalog/);
    assert.doesNotMatch(page, /manager\.trainings\.waitingTitle/);
    assert.doesNotMatch(page, /id="pending"/);
  });

  it("scrolls available trainings after three cards", () => {
    const catalog = readRepo("components/manager/training-catalog.tsx");
    const scroller = readRepo("components/manager/catalog-scroll-list.tsx");
    const styles = readRepo("app/globals.css");

    assert.match(catalog, /CatalogScrollList/);
    assert.match(scroller, /brand-scroll/);
    assert.match(scroller, /overflow-y-auto/);
    assert.match(scroller, /CATALOG_VISIBLE_ROWS/);
    assert.match(styles, /\.brand-scroll\s*\{/);
    assert.match(styles, /scrollbar-width:\s*thin/);
  });

  it("spreads the training picture across the card cover well", () => {
    const card = readRepo("components/father/training-catalog-card.tsx");
    const cover = readRepo("components/brand/cover.tsx");
    const scene = readRepo("components/brand/scene.tsx");

    assert.match(card, /relative block w-full overflow-hidden bg-\[#101510\]/);
    assert.match(card, /lg:h-full lg:min-h-\[17rem\]/);
    assert.doesNotMatch(card, /lg:h-auto/);
    assert.match(cover, /absolute inset-0 size-full object-cover/);
    assert.match(cover, /SceneArt className="absolute inset-0 size-full"/);
    assert.match(scene, /preserveAspectRatio="xMidYMid slice"/);
  });

  it("separates available and completed trainings on the father desk", () => {
    const page = readRepo("app/(father)/father/trainings/page.tsx");
    const card = readRepo("components/father/training-catalog-card.tsx");
    assert.match(page, /isHomeTrainingComplete/);
    assert.match(page, /father\.trainings\.available/);
    assert.match(page, /father\.trainings\.completedGroup/);
    assert.match(page, /rounded-xl border border-border/);
    assert.match(page, /divide-y divide-border/);
    assert.match(page, /completedGroup[\s\S]*sideBySide/s);
    assert.match(card, /featured \|\| sideBySide/);
    assert.match(card, /lg:grid lg:grid-cols-2 lg:items-stretch/);
    assert.match(card, /father\.trainings\.watchAgain/);
    assert.match(card, /watchAgainHref/);
  });

  it("lets a father watch a completed training again without issuing a certificate", () => {
    const card = readRepo("components/father/training-catalog-card.tsx");
    const door = readRepo("lib/father/training-door.ts");
    const actions = readRepo("lib/father/actions.ts");
    const film = readRepo("app/(father)/father/sessions/[sessionId]/page.tsx");
    const issue = readRepo("lib/manager/mutations.ts");

    assert.match(card, /Watch again|watchAgain/);
    assert.match(door, /reviewSessionHref/);
    assert.match(door, /reviewSessionHref\(input\.sessionDots\)/);
    assert.match(actions, /isSessionComplete\(context\.progress\)/);
    assert.match(actions, /existing\?\.completed_at/);
    assert.doesNotMatch(actions, /issueCertificateToFather/);
    assert.match(film, /father\.trainings\.watchAgainHint/);
    assert.match(issue, /A certificate is already on file/);
  });

  it("shows Included in green and Declined in red on the selected button", () => {
    const buttons = readRepo("components/manager/catalog-decision-buttons.tsx");
    assert.match(buttons, /manager\.trainings\.included/);
    assert.match(buttons, /manager\.trainings\.declined/);
    assert.match(buttons, /manager\.trainings\.include/);
    assert.match(buttons, /manager\.trainings\.decline/);
    assert.match(buttons, /disabled:opacity-100/);
    assert.match(buttons, /bg-destructive text-white/);
  });
});
