import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { Training } from "@/lib/father/types";
import { dateLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import {
  COMPLETION_STATUS_LABEL,
  filterSummary,
  type ReportFilters,
  type ReportRow,
} from "@/lib/manager/reports";
import { formatShortDate } from "@/lib/manager/types";
import { embedExportFonts, fitPdfText, shapePdfText } from "@/lib/pdf/fonts";

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
  { key: "name", label: "Name", width: 156 },
  { key: "status", label: "Status", width: 88 },
  { key: "assignments", label: "Assignments", width: 188 },
  { key: "serials", label: "Certificate serials", width: 188 },
  { key: "activity", label: "Last activity", width: 100 },
] as const;

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  locale: Locale
) {
  page.drawText(shapePdfText(text, locale), { x, y, font, size, color });
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number, locale: Locale) {
  return fitPdfText(shapePdfText(text, locale), font, size, maxWidth);
}

function statusCopy(status: ReportRow["completionStatus"], locale: Locale, t: Translate) {
  if (locale !== "he") {
    return COMPLETION_STATUS_LABEL[status];
  }
  if (status === "completed") return t("manager.reports.completed");
  if (status === "in_progress") return t("manager.reports.inProgress");
  return t("manager.reports.notStarted");
}

function cellValues(row: ReportRow, locale: Locale, t: Translate) {
  if (locale !== "he") {
    return {
      name: row.name,
      status: COMPLETION_STATUS_LABEL[row.completionStatus],
      assignments: row.assignmentTitles.join("; ") || "None assigned",
      serials: row.certificateSerials || "—",
      activity: formatShortDate(row.lastActivity),
    };
  }

  return {
    name: row.name,
    status: statusCopy(row.completionStatus, locale, t),
    assignments: row.assignmentTitles.join("; ") || t("manager.reports.noneAssigned"),
    serials: row.certificateSerials || t("common.emDash"),
    activity: row.lastActivity
      ? new Date(row.lastActivity).toLocaleDateString(dateLocale(locale), {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : t("common.emDash"),
  };
}

function columnLabels(locale: Locale, t: Translate) {
  if (locale !== "he") return COLS;
  return [
    { key: "name", label: t("manager.reports.name"), width: 156 },
    { key: "status", label: t("manager.reports.statusCol"), width: 88 },
    { key: "assignments", label: t("manager.reports.assignments"), width: 188 },
    { key: "serials", label: t("manager.reports.csvSerials"), width: 188 },
    { key: "activity", label: t("manager.reports.lastActivity"), width: 100 },
  ] as const;
}

function drawHeader(
  page: PDFPage,
  y: number,
  font: PDFFont,
  bold: PDFFont,
  filters: ReportFilters,
  trainings: Training[],
  generatedOn: string,
  matched: number,
  locale: Locale,
  t: Translate
) {
  const title = locale === "he" ? t("manager.reports.pdfTitle") : "Fathers.com Leader Report";
  drawText(page, title, MARGIN, y, bold, 16, FOREST, locale);
  const dateWidth = font.widthOfTextAtSize(shapePdfText(generatedOn, locale), 9);
  drawText(page, generatedOn, PAGE_WIDTH - MARGIN - dateWidth, y + 2, font, 9, MUTED, locale);

  const summary = filterSummary(filters, trainings, locale);
  const count =
    locale === "he"
      ? matched === 1
        ? t("manager.reports.participantsOne")
        : t("manager.reports.participantsMany", { n: matched })
      : `${matched} participant${matched === 1 ? "" : "s"}`;
  const line =
    locale === "he"
      ? t("manager.reports.pdfFilter", {
          training: summary.training,
          status: summary.status,
          range: summary.range,
          count,
        })
      : `Training: ${summary.training}  ·  Status: ${summary.status}  ·  Last activity: ${summary.range}  ·  ${count}`;
  drawText(
    page,
    fit(line, font, 9, PAGE_WIDTH - MARGIN * 2, locale),
    MARGIN,
    y - 18,
    font,
    9,
    MUTED,
    DEFAULT_LOCALE
  );
}

function drawTableHead(page: PDFPage, y: number, font: PDFFont, locale: Locale, t: Translate) {
  let x = MARGIN;
  page.drawRectangle({
    x: MARGIN,
    y: y - 4,
    width: PAGE_WIDTH - MARGIN * 2,
    height: ROW_HEIGHT,
    color: FOREST,
  });
  for (const col of columnLabels(locale, t)) {
    drawText(page, col.label, x + 4, y + 2, font, 8, HEADER_TEXT, locale);
    x += col.width;
  }
}

function drawRow(
  page: PDFPage,
  y: number,
  font: PDFFont,
  row: ReportRow,
  zebra: boolean,
  locale: Locale,
  t: Translate
) {
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
  const values = cellValues(row, locale, t);
  for (const col of columnLabels(locale, t)) {
    drawText(
      page,
      fit(values[col.key], font, 8, col.width - 8, locale),
      x + 4,
      y + 1,
      font,
      8,
      INK,
      DEFAULT_LOCALE
    );
    x += col.width;
  }
}

export async function renderReportPdf(
  rows: ReportRow[],
  filters: ReportFilters,
  trainings: Training[],
  locale: Locale = DEFAULT_LOCALE
) {
  try {
    return await renderReportPdfWithLocale(rows, filters, trainings, locale);
  } catch (error) {
    if (locale === "he") {
      console.error("Hebrew manager report PDF failed; falling back to English.", error);
      return renderReportPdfWithLocale(rows, filters, trainings, DEFAULT_LOCALE);
    }
    throw error;
  }
}

async function renderReportPdfWithLocale(
  rows: ReportRow[],
  filters: ReportFilters,
  trainings: Training[],
  locale: Locale
) {
  const t = createTranslator(locale);
  const doc = await PDFDocument.create();
  doc.setTitle(locale === "he" ? t("manager.reports.pdfTitle") : "Fathers.com Leader Report");
  doc.setAuthor("Fathers.com");
  doc.setCreator("Fathers.com");

  const fonts = await embedExportFonts(doc, locale);
  const font = fonts.regular;
  const bold = fonts.bold;
  const generatedOn = new Date().toLocaleDateString(
    locale === "he" ? dateLocale(locale) : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const firstTop = PAGE_HEIGHT - 56;
  const nextTop = PAGE_HEIGHT - 40;
  const bottom = MARGIN + 20;
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = firstTop;
  let pageIndex = 1;

  const stampPage = (target: PDFPage, index: number) => {
    const label = locale === "he" ? t("manager.reports.page", { n: index }) : `Page ${index}`;
    const labelWidth = font.widthOfTextAtSize(shapePdfText(label, locale), 8);
    drawText(target, label, PAGE_WIDTH - MARGIN - labelWidth, 22, font, 8, MUTED, locale);
    const footer =
      locale === "he" ? t("manager.cert.pdfTagline") : "Fathers.com  ·  Presence is a skill.";
    drawText(target, footer, MARGIN, 22, font, 8, MUTED, locale);
  };

  drawHeader(page, y, font, bold, filters, trainings, generatedOn, rows.length, locale, t);
  y -= 40;
  drawTableHead(page, y, bold, locale, t);
  y -= ROW_HEIGHT;

  if (rows.length === 0) {
    const empty =
      locale === "he" ? t("manager.reports.noMatch") : "No participants match these filters.";
    drawText(page, empty, MARGIN, y, font, 10, MUTED, locale);
    stampPage(page, pageIndex);
    return doc.save();
  }

  rows.forEach((row, index) => {
    if (y < bottom) {
      stampPage(page, pageIndex);
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageIndex += 1;
      y = nextTop;
      drawTableHead(page, y, bold, locale, t);
      y -= ROW_HEIGHT;
    }
    drawRow(page, y, font, row, index % 2 === 1, locale, t);
    y -= ROW_HEIGHT;
  });

  stampPage(page, pageIndex);
  return doc.save();
}
