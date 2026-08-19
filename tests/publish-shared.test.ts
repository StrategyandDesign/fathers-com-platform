import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isInternalRemote,
  isSharedRemote,
  nextSharedMark,
  parseSharedLedger,
  readSharedMark,
  renderSharedLedger,
  shouldPreserve,
  upsertLedgerRow,
} from "../scripts/publish-shared.mjs";

describe("shared publish marks", () => {
  it("numbers the next mark from shared/ tags and starts at 1", () => {
    assert.equal(nextSharedMark([]), 1);
    assert.equal(nextSharedMark(["shared/1", "shared/3", "submit/2"]), 4);
  });

  it("keeps the isolated Hebrew catalog when overlaying an internal tree", () => {
    assert.equal(shouldPreserve("lib/i18n/messages/he.ts"), true);
    assert.equal(shouldPreserve("lib/i18n/translate.ts"), true);
    assert.equal(shouldPreserve("app/(admin)/admin/assessments/page.tsx"), false);
  });

  it("treats the isolated remote as Eric's shared repo, not the internal one", () => {
    assert.equal(isSharedRemote("clean-pilot-only", "https://github.com/StrategyandDesign/fathers-com-clean-pilot"), true);
    assert.equal(isInternalRemote("origin", "https://github.com/StrategyandDesign/fathers-com-platform"), true);
    assert.equal(isSharedRemote("origin", "https://github.com/StrategyandDesign/fathers-com-platform"), false);
  });

  it("round-trips the numbered ledger Eric can open on GitHub", () => {
    const markdown = renderSharedLedger([
      {
        mark: 1,
        date: "2026-08-19",
        tag: "shared/1",
        internalSha: "b6ab1daabcdef",
        title: "Bring researcher assessments onto the Super-admin desk.",
      },
    ]);
    const rows = parseSharedLedger(markdown);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].mark, 1);
    assert.equal(rows[0].tag, "shared/1");
    assert.equal(rows[0].internalSha, "b6ab1da");
    assert.match(markdown, /not official Submit stamps/);
    const updated = upsertLedgerRow(rows, {
      mark: 1,
      date: "2026-08-19",
      tag: "shared/1",
      internalSha: "cafebab",
      title: "Updated title",
    });
    assert.equal(updated.length, 1);
    assert.equal(updated[0].internalSha, "cafebab");
  });

  it("reads the local Shared badge file", () => {
    const mark = readSharedMark(
      JSON.stringify({
        mark: 2,
        tag: "shared/2",
        at: "2026-08-19T15:00:00.000Z",
        internalSha: "aaa",
        sharedSha: "bbb",
        title: "Example",
        url: "https://github.com/StrategyandDesign/fathers-com-clean-pilot/releases/tag/shared/2",
      })
    );
    assert.equal(mark?.mark, 2);
    assert.equal(mark?.tag, "shared/2");
    assert.equal(readSharedMark("{"), null);
  });
});
