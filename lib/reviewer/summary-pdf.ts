import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { dateLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import type { ReviewerImpactSummary } from "@/lib/reviewer/summary";
import { embedExportFonts, fitPdfText, shapePdfText } from "@/lib/pdf/fonts";

const FOREST = rgb(0x32 / 255, 0x66 / 255, 0x38 / 255);
const INK = rgb(0x14 / 255, 0x12 / 255, 0x10 / 255);
const MUTED = rgb(0x5c / 255, 0x56 / 255, 0x48 / 255);
const RULE = rgb(0xe6 / 255, 0xe2 / 255, 0xd8 / 255);
const PAPER = rgb(0.99, 0.98, 0.96);

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;

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

function drawMetric(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  detail: string,
  font: PDFFont,
  bold: PDFFont,
  locale: Locale
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: RULE,
    borderWidth: 1,
  });
  const heading = locale === "he" ? label : label.toUpperCase();
  drawText(page, heading, x + 12, y - 22, font, 8, MUTED, locale);
  drawText(page, value, x + 12, y - 48, bold, 22, INK, locale);
  drawText(page, fit(detail, font, 9, width - 24, locale), x + 12, y - 68, font, 9, MUTED, DEFAULT_LOCALE);
}

export async function renderReviewerSummaryPdf(
  summary: ReviewerImpactSummary,
  locale: Locale = DEFAULT_LOCALE
) {
  try {
    return await renderReviewerSummaryPdfWithLocale(summary, locale);
  } catch (error) {
    if (locale === "he") {
      console.error("Hebrew reviewer summary PDF failed; falling back to English.", error);
      return renderReviewerSummaryPdfWithLocale(summary, DEFAULT_LOCALE);
    }
    throw error;
  }
}

async function renderReviewerSummaryPdfWithLocale(
  summary: ReviewerImpactSummary,
  locale: Locale
) {
  const t = createTranslator(locale);
  const doc = await PDFDocument.create();
  doc.setTitle(locale === "he" ? t("reviewer.summary.title") : "Fathers.com Impact Summary");
  doc.setAuthor("Fathers.com");
  doc.setCreator("Fathers.com");
  doc.setSubject(
    locale === "he" ? t("reviewer.summary.countsOnly") : "Anonymized program outcomes. No personal data."
  );

  const fonts = await embedExportFonts(doc, locale);
  const font = fonts.regular;
  const bold = fonts.bold;
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const generatedOn = new Date(summary.generatedAt).toLocaleDateString(
    locale === "he" ? dateLocale(locale) : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: PAPER,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 8,
    width: PAGE_WIDTH,
    height: 8,
    color: FOREST,
  });

  let y = PAGE_HEIGHT - 44;
  drawText(
    page,
    locale === "he" ? t("reviewer.summary.kickerPdf") : "Fathers.com  ·  Anonymized",
    MARGIN,
    y,
    font,
    10,
    FOREST,
    locale
  );
  const dateWidth = font.widthOfTextAtSize(shapePdfText(generatedOn, locale), 9);
  drawText(page, generatedOn, PAGE_WIDTH - MARGIN - dateWidth, y, font, 9, MUTED, locale);

  y -= 28;
  drawText(
    page,
    locale === "he" ? t("reviewer.summary.title") : "Impact Summary",
    MARGIN,
    y,
    bold,
    22,
    INK,
    locale
  );
  y -= 16;
  drawText(
    page,
    locale === "he"
      ? t("reviewer.summary.outcomes")
      : "Program outcomes for a board, funder, or leadership update.",
    MARGIN,
    y,
    font,
    9,
    MUTED,
    locale
  );
  y -= 14;
  drawText(
    page,
    locale === "he"
      ? t("reviewer.summary.countsOnly")
      : "Counts only. No names, emails, or certificate serials.",
    MARGIN,
    y,
    font,
    9,
    MUTED,
    locale
  );

  y -= 22;
  drawText(
    page,
    locale === "he" ? t("reviewer.summary.filters") : "Filters applied",
    MARGIN,
    y,
    bold,
    11,
    INK,
    locale
  );
  y -= 14;
  for (const line of summary.filterLines) {
    drawText(page, fit(line, font, 9, PAGE_WIDTH - MARGIN * 2, locale), MARGIN, y, font, 9, MUTED, DEFAULT_LOCALE);
    y -= 12;
  }

  const boxWidth = (PAGE_WIDTH - MARGIN * 2 - 12) / 2;
  const boxHeight = 80;
  const metrics = locale === "he" ? hebrewMetrics(summary, t) : englishMetrics(summary);

  y -= 8;
  metrics.forEach((metric, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    drawMetric(
      page,
      MARGIN + col * (boxWidth + 12),
      y - row * (boxHeight + 10),
      boxWidth,
      boxHeight,
      metric.label,
      metric.value,
      metric.detail,
      font,
      bold,
      locale
    );
  });

  y -= 3 * (boxHeight + 10) + 8;

  if (summary.trend) {
    drawText(
      page,
      locale === "he" ? t("reviewer.summary.periodTitle") : "Period comparison",
      MARGIN,
      y,
      bold,
      12,
      INK,
      locale
    );
    y -= 14;
    const suffix = summary.trend.unit === "completion rate" || summary.trend.unit === t("reviewer.summary.completionRate")
      ? "%"
      : ` ${summary.trend.unit}`;
    drawText(
      page,
      fit(
        `${summary.trend.leftLabel}: ${summary.trend.left}${suffix}   ·   ${summary.trend.rightLabel}: ${summary.trend.right}${suffix}`,
        font,
        9,
        PAGE_WIDTH - MARGIN * 2,
        locale
      ),
      MARGIN,
      y,
      font,
      9,
      MUTED,
      DEFAULT_LOCALE
    );
    y -= 20;
  }

  if (summary.groups.length > 0) {
    drawText(
      page,
      locale === "he" ? t("reviewer.summary.groupTitle") : "Group comparison",
      MARGIN,
      y,
      bold,
      12,
      INK,
      locale
    );
    y -= 16;
    drawText(page, locale === "he" ? t("reviewer.summary.group") : "Group", MARGIN, y, font, 8, MUTED, locale);
    drawText(
      page,
      locale === "he" ? t("reviewer.summary.enrolled") : "Enrolled",
      MARGIN + 120,
      y,
      font,
      8,
      MUTED,
      locale
    );
    drawText(
      page,
      locale === "he" ? t("reviewer.summary.started") : "Started",
      MARGIN + 200,
      y,
      font,
      8,
      MUTED,
      locale
    );
    drawText(
      page,
      locale === "he" ? t("reviewer.summary.oneSessionCol") : "One session",
      MARGIN + 280,
      y,
      font,
      8,
      MUTED,
      locale
    );
    drawText(
      page,
      locale === "he" ? t("reviewer.summary.completed") : "Completed",
      MARGIN + 380,
      y,
      font,
      8,
      MUTED,
      locale
    );
    y -= 14;
    for (const group of summary.groups.slice(0, 8)) {
      drawText(page, fit(group.label, bold, 10, 110, locale), MARGIN, y, bold, 10, INK, DEFAULT_LOCALE);
      drawText(page, String(group.enrolled), MARGIN + 120, y, font, 10, INK, locale);
      drawText(page, `${group.startedPct}%`, MARGIN + 200, y, font, 10, INK, locale);
      drawText(page, `${group.oneSessionPct}%`, MARGIN + 280, y, font, 10, INK, locale);
      drawText(page, `${group.fullyCompletedPct}%`, MARGIN + 380, y, font, 10, INK, locale);
      y -= 14;
    }
  }

  drawText(
    page,
    locale === "he"
      ? t("reviewer.summary.footerPdf")
      : "Fathers.com  ·  Presence is a skill.  ·  Anonymized counts only.",
    MARGIN,
    36,
    font,
    8,
    MUTED,
    locale
  );

  return doc.save();
}

function englishMetrics(summary: ReviewerImpactSummary) {
  return [
    {
      label: "Participants",
      value: String(summary.totalParticipants),
      detail: "People in this filtered cohort",
    },
    {
      label: "Start rate",
      value: `${summary.startedPct}%`,
      detail: `${summary.startedCount} of ${summary.totalParticipants} began a session`,
    },
    {
      label: "Completed a session",
      value: `${summary.oneSessionPct}%`,
      detail: `${summary.oneSessionCount} finished at least one session`,
    },
    {
      label: "Fully completed",
      value: `${summary.fullyCompletedPct}%`,
      detail: `${summary.fullyCompletedCount} finished a training`,
    },
    {
      label: "Certificates issued",
      value: String(summary.certificatesIssued),
      detail: "Completion certificates on file",
    },
  ];
}

function hebrewMetrics(summary: ReviewerImpactSummary, t: Translate) {
  return [
    {
      label: t("reviewer.summary.participants"),
      value: String(summary.totalParticipants),
      detail: t("reviewer.summary.participantsDetail"),
    },
    {
      label: t("reviewer.summary.startRate"),
      value: `${summary.startedPct}%`,
      detail: t("reviewer.summary.startDetail", {
        count: summary.startedCount,
        total: summary.totalParticipants,
      }),
    },
    {
      label: t("reviewer.summary.oneSession"),
      value: `${summary.oneSessionPct}%`,
      detail: t("reviewer.summary.oneSessionDetail", { count: summary.oneSessionCount }),
    },
    {
      label: t("reviewer.summary.fully"),
      value: `${summary.fullyCompletedPct}%`,
      detail: t("reviewer.summary.fullyDetail", { count: summary.fullyCompletedCount }),
    },
    {
      label: t("reviewer.summary.certs"),
      value: String(summary.certificatesIssued),
      detail: t("reviewer.summary.certsDetail"),
    },
  ];
}
