import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { decodePngRgba, FATHERS_FOREST, tintPngRgba } from "../lib/brand/lockup-png";
import { renderCertificatePdf } from "../lib/certificates/pdf";
import { certificateDownloadPath, certificatePreviewPath } from "../lib/certificates/types";

function readRepo(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

describe("certificate lockup", () => {
  it("tints the official Fathers.com lockup forest green", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../public/brand/fathers-com-logo-white.png", import.meta.url))
    );
    const tinted = tintPngRgba(source, FATHERS_FOREST);
    const { rgba } = decodePngRgba(tinted);
    let forest = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      if (
        (rgba[i + 3] ?? 0) > 200 &&
        rgba[i] === FATHERS_FOREST.r &&
        rgba[i + 1] === FATHERS_FOREST.g &&
        rgba[i + 2] === FATHERS_FOREST.b
      ) {
        forest += 1;
      }
    }
    assert.ok(forest > 1000);
  });

  it("embeds the lockup instead of the old shield drawing", async () => {
    const pdf = readRepo("lib/certificates/pdf.ts");
    assert.match(pdf, /BRAND_LOCKUP_FILE/);
    assert.match(pdf, /drawFathersLockup/);
    assert.doesNotMatch(pdf, /M 20 41\.2 L 36\.2 31\.8/);
    assert.match(readRepo("lib/brand/lockup-png.ts"), /fathers-com-logo-white\.png/);

    const bytes = await renderCertificatePdf({
      fatherName: "NWA Father",
      trainingName: "Fathering Fundamentals – Seven Secrets of Effective Fathers",
      completedOn: "August 19, 2026",
      serialNumber: "FC-2026-06321614",
      managerName: "Brenda",
    });
    assert.equal(Buffer.from(bytes.subarray(0, 4)).toString(), "%PDF");
    assert.ok(bytes.length > 2000);
  });
});

describe("certificate preview", () => {
  it("opens a preview before the download file", () => {
    assert.equal(certificatePreviewPath("c1"), "/father/certificates/c1");
    assert.equal(certificateDownloadPath("c1"), "/api/certificates/c1/download");

    const home = readRepo("components/father/home-earned.tsx");
    assert.match(home, /certificatePreviewPath/);
    assert.match(home, /size="snapshot"/);
    assert.doesNotMatch(home, /certificateDownloadPath/);

    const list = readRepo("components/certificates/issued-list.tsx");
    assert.match(list, /certificatePreviewPath/);
    assert.match(list, /common\.preview/);
    assert.match(list, /CertificateDownloadLink/);

    const page = readRepo("app/(father)/father/certificates/[id]/page.tsx");
    assert.match(page, /CertificateFace/);
    assert.match(page, /CertificateDownloadLink/);
    assert.match(page, /account\.certificatePreviewLead/);

    const face = readRepo("components/certificates/certificate-face.tsx");
    assert.match(face, /tone="forest"/);
    assert.match(face, /BrandMark/);
  });
});
