import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

import { BRAND_LOCKUP_FILE, FATHERS_FOREST, tintPngRgba } from "@/lib/brand/lockup-png";
import type { CertificatePayload } from "@/lib/certificates/types";
import { embedExportFonts, shapePdfText } from "@/lib/pdf/fonts";

function hasHebrew(text: string) {
  return /[\u0590-\u05FF]/.test(text);
}

const FOREST = rgb(0x32 / 255, 0x66 / 255, 0x38 / 255);
const INK = rgb(0x14 / 255, 0x12 / 255, 0x10 / 255);
const MUTED = rgb(0x5c / 255, 0x56 / 255, 0x48 / 255);
const PAGE = rgb(1, 1, 1);

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;

export async function renderCertificatePdf(input: CertificatePayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Fathers.com Certificate ${input.serialNumber}`);
  doc.setAuthor("Fathers.com");
  doc.setCreator("Fathers.com");

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const needsHebrew = [input.fatherName, input.trainingName, input.managerName].some(hasHebrew);
  let heebo: { regular: PDFFont; bold: PDFFont } | null = null;
  if (needsHebrew) {
    try {
      heebo = await embedExportFonts(doc, "he");
    } catch {
      heebo = null;
    }
  }

  function field(text: string, prefer: PDFFont, fallback: string) {
    if (heebo && hasHebrew(text)) {
      return { font: prefer === serif || prefer === serifItalic ? heebo.regular : heebo.bold, text: shapePdfText(text, "he") };
    }
    if (!hasHebrew(text)) return { font: prefer, text };
    const safe = text.replace(/[\u0590-\u05FF]/g, "").replace(/\s+/g, " ").trim();
    return { font: prefer, text: safe || fallback };
  }

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: PAGE,
  });

  page.drawRectangle({
    x: 22,
    y: 22,
    width: PAGE_WIDTH - 44,
    height: PAGE_HEIGHT - 44,
    borderColor: FOREST,
    borderWidth: 10,
  });
  page.drawRectangle({
    x: 36,
    y: 36,
    width: PAGE_WIDTH - 72,
    height: PAGE_HEIGHT - 72,
    borderColor: FOREST,
    borderWidth: 1,
  });

  const contentWidth = PAGE_WIDTH - 160;
  let y = PAGE_HEIGHT - 78;

  const lockupDrawn = await drawFathersLockup(doc, page, PAGE_WIDTH / 2, y);
  y -= lockupDrawn ? 58 : 20;
  if (!lockupDrawn) {
    drawTrackedCenter(page, "FATHERS.COM", y, sansBold, 13, FOREST, 2.4);
    y -= 28;
  }
  drawTrackedCenter(page, "CERTIFICATE OF COMPLETION", y, sans, 11, MUTED, 2.1);
  y -= 16;
  drawCentered(page, "National Center for Fathering", y, serifItalic, 11, MUTED);

  y -= 52;
  const father = field(input.fatherName, serifBold, "Father");
  const nameSize = fitSize(father.text, father.font, contentWidth, 36, 18);
  drawCentered(page, father.text, y, father.font, nameSize, INK);

  y -= 36;
  drawCentered(page, "has completed", y, serifItalic, 14, MUTED);

  y -= 28;
  const training = field(input.trainingName, serifBold, "Training");
  if (hasHebrew(input.trainingName) && heebo) {
    const titleSize = fitSize(training.text, training.font, contentWidth, 18, 12);
    drawCentered(page, training.text, y, training.font, titleSize, INK);
    y -= 24;
  } else {
    const titleLines = wrapLines(training.text, training.font, 18, contentWidth);
    for (const line of titleLines) {
      drawCentered(page, line, y, training.font, 18, INK);
      y -= 24;
    }
  }

  y -= 8;
  page.drawLine({
    start: { x: PAGE_WIDTH / 2 - 36, y },
    end: { x: PAGE_WIDTH / 2 + 36, y },
    color: FOREST,
    thickness: 1.25,
  });

  y -= 42;
  const col = contentWidth / 3;
  const left = 80;
  drawTracked(page, "COMPLETED", left, y, sans, 8, MUTED, 1.1);
  drawTrackedCenterIn(page, "SERIAL", left + col, col, y, sans, 8, MUTED, 1.1);
  drawTrackedRight(page, "ISSUED BY", left + col * 2, col, y, sans, 8, MUTED, 1.1);

  y -= 18;
  page.drawText(input.completedOn, {
    x: left,
    y,
    font: serif,
    size: 12,
    color: INK,
  });
  drawCenteredIn(page, input.serialNumber, left + col, col, y, mono, 11, INK);
  const issuer = field(input.managerName, serif, "Leader");
  drawRight(page, issuer.text, left + col * 2, col, y, issuer.font, 12, INK);

  page.drawText("Fathers.com  ·  Presence is a skill.", {
    x: (PAGE_WIDTH - sans.widthOfTextAtSize("Fathers.com  ·  Presence is a skill.", 8)) / 2,
    y: 52,
    font: sans,
    size: 8,
    color: MUTED,
  });

  return doc.save();
}

async function drawFathersLockup(
  doc: PDFDocument,
  page: PDFPage,
  cx: number,
  top: number
) {
  try {
    const source = await readFile(path.join(process.cwd(), BRAND_LOCKUP_FILE));
    const image = await doc.embedPng(tintPngRgba(source, FATHERS_FOREST));
    const height = 46;
    const width = (image.width / image.height) * height;
    page.drawImage(image, {
      x: cx - width / 2,
      y: top - height,
      width,
      height,
    });
    return true;
  } catch {
    return false;
  }
}

function fitSize(text: string, font: PDFFont, maxWidth: number, max: number, min: number) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (PAGE_WIDTH - width) / 2,
    y,
    font,
    size,
    color,
  });
}

function drawCenteredIn(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + (width - textWidth) / 2,
    y,
    font,
    size,
    color,
  });
}

function drawRight(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + width - textWidth,
    y,
    font,
    size,
    color,
  });
}

function drawTracked(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  tracking: number
) {
  let cursor = x;
  for (const char of text) {
    page.drawText(char, { x: cursor, y, font, size, color });
    cursor += font.widthOfTextAtSize(char, size) + tracking;
  }
}

function drawTrackedCenter(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  tracking: number
) {
  const total =
    [...text].reduce((sum, char) => sum + font.widthOfTextAtSize(char, size), 0) +
    tracking * Math.max(0, text.length - 1);
  drawTracked(page, text, (PAGE_WIDTH - total) / 2, y, font, size, color, tracking);
}

function drawTrackedCenterIn(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  tracking: number
) {
  const total =
    [...text].reduce((sum, char) => sum + font.widthOfTextAtSize(char, size), 0) +
    tracking * Math.max(0, text.length - 1);
  drawTracked(page, text, x + (width - total) / 2, y, font, size, color, tracking);
}

function drawTrackedRight(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  tracking: number
) {
  const total =
    [...text].reduce((sum, char) => sum + font.widthOfTextAtSize(char, size), 0) +
    tracking * Math.max(0, text.length - 1);
  drawTracked(page, text, x + width - total, y, font, size, color, tracking);
}
