import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { Training } from "@/lib/father/types";
import {
  COMPLETION_STATUS_LABEL,
  PROFILE_STATUS_LABEL,
  filterSummary,
  type ReportFilters,
  type ReportRow,
} from "@/lib/manager/reports";
import { formatShortDate } from "@/lib/manager/types";

const FOREST = rgb(0x32 / 255, 0x66 / 255, 0x38 / 255);
const INK = rgb(0x14 / 255, 0x12 / 255, 0x10 / 255);
const MUTED = rgb(0x5c / 255, 0x56 / 255, 0x48 / 255);
const RULE = rgb(0xe6 / 255, 0xe2 / 255, 0xd8 / 255);
const HEADER_TEXT = rgb(1, 1, 1);

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const MARGIN = 36;
const ROW_HEIGHT = 18;
const COLS = [
  { key: "name", label: "Name", width: 128 },
  { key: "profile", label: "Profile", width: 78 },
  { key: "status", label: "Status", width: 78 },
  { key: "assignments", label: "Assignments", width: 168 },
  { key: "serials", label: "Certificate serials", width: 168 },
  { key: "activity", label: "Last activity", width: 100 },
] as const;

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "…";
  let cut = text;
  while (cut.length > 0 && font.widthOfTextAtSize(cut + ellipsis, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}${ellipsis}`;
}

function cellValues(row: ReportRow) {
  return {
    name: row.name,
    profile: PROFILE_STATUS_LABEL[row.profileStatus],
    status: COMPLETION_STATUS_LABEL[row.completionStatus],
    assignments: row.assignmentTitles.join("; ") || "None assigned",
    serials: row.certificateSerials || "—",
    activity: formatShortDate(row.lastActivity),
  };
}

function drawHeader(
  page: PDFPage,
  y: number,
  font: PDFFont,
  bold: PDFFont,
  filters: ReportFilters,
  trainings: Training[],
  generatedOn: string,
  matched: number
) {
  page.drawText("Fathers.com Manager Report", {
    x: MARGIN,
    y,
    font: bold,
    size: 16,
    color: FOREST,
  });
  page.drawText(generatedOn, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(generatedOn, 9),
    y: y + 2,
    font,
    size: 9,
    color: MUTED,
  });

  const summary = filterSummary(filters, trainings);
  const line = `Training: ${summary.training}  ·  Status: ${summary.status}  ·  Last activity: ${summary.range}  ·  ${matched} participant${matched === 1 ? "" : "s"}`;
  page.drawText(fitText(line, font, 9, PAGE_WIDTH - MARGIN * 2), {
    x: MARGIN,
    y: y - 18,
    font,
    size: 9,
    color: MUTED,
  });
}

function drawTableHead(page: PDFPage, y: number, font: PDFFont) {
  let x = MARGIN;
  page.drawRectangle({
    x: MARGIN,
    y: y - 4,
    width: PAGE_WIDTH - MARGIN * 2,
    height: ROW_HEIGHT,
    color: FOREST,
  });
  for (const col of COLS) {
    page.drawText(col.label, {
      x: x + 4,
      y: y + 2,
      font,
      size: 8,
      color: HEADER_TEXT,
    });
    x += col.width;
  }
}

function drawRow(page: PDFPage, y: number, font: PDFFont, row: ReportRow, zebra: boolean) {
  let x = MARGIN;
  if (zebra) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: PAGE_WIDTH - MARGIN * 2,
      height: ROW_HEIGHT,
      color: RULE,
    });
  }
  const values = cellValues(row);
  for (const col of COLS) {
    page.drawText(fitText(values[col.key], font, 8, col.width - 8), {
      x: x + 4,
      y: y + 1,
      font,
      size: 8,
      color: INK,
    });
    x += col.width;
  }
}

export async function renderReportPdf(
  rows: ReportRow[],
  filters: ReportFilters,
  trainings: Training[]
) {
  const doc = await PDFDocument.create();
  doc.setTitle("Fathers.com Manager Report");
  doc.setAuthor("Fathers.com");
  doc.setCreator("Fathers.com");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const firstTop = PAGE_HEIGHT - 56;
  const nextTop = PAGE_HEIGHT - 40;
  const bottom = MARGIN + 20;
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = firstTop;
  let pageIndex = 1;

  const stampPage = (target: PDFPage, index: number) => {
    const label = `Page ${index}`;
    target.drawText(label, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(label, 8),
      y: 22,
      font,
      size: 8,
      color: MUTED,
    });
    target.drawText("Fathers.com  ·  Presence is a skill.", {
      x: MARGIN,
      y: 22,
      font,
      size: 8,
      color: MUTED,
    });
  };

  drawHeader(page, y, font, bold, filters, trainings, generatedOn, rows.length);
  y -= 40;
  drawTableHead(page, y, bold);
  y -= ROW_HEIGHT;

  if (rows.length === 0) {
    page.drawText("No participants match these filters.", {
      x: MARGIN,
      y,
      font,
      size: 10,
      color: MUTED,
    });
    stampPage(page, pageIndex);
    return doc.save();
  }

  rows.forEach((row, index) => {
    if (y < bottom) {
      stampPage(page, pageIndex);
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageIndex += 1;
      y = nextTop;
      drawTableHead(page, y, bold);
      y -= ROW_HEIGHT;
    }
    drawRow(page, y, font, row, index % 2 === 1);
    y -= ROW_HEIGHT;
  });

  stampPage(page, pageIndex);
  return doc.save();
}
