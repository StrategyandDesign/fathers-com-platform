import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { dateLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import { trendLabel, type ImpactSnapshot } from "@/lib/manager/impact";
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

export async function renderImpactPdf(
  snapshot: ImpactSnapshot,
  locale: Locale = DEFAULT_LOCALE
) {
  try {
    return await renderImpactPdfWithLocale(snapshot, locale);
  } catch (error) {
    if (locale === "he") {
      console.error("Hebrew impact PDF failed; falling back to English.", error);
      return renderImpactPdfWithLocale(snapshot, DEFAULT_LOCALE);
    }
    throw error;
  }
}

async function renderImpactPdfWithLocale(snapshot: ImpactSnapshot, locale: Locale) {
  const t = createTranslator(locale);
  const doc = await PDFDocument.create();
  doc.setTitle(locale === "he" ? t("manager.impact.pdfTitle") : "Fathers.com Impact Snapshot");
  doc.setAuthor("Fathers.com");
  doc.setCreator("Fathers.com");

  const fonts = await embedExportFonts(doc, locale);
  const font = fonts.regular;
  const bold = fonts.bold;
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const generatedOn = new Date(snapshot.generatedAt).toLocaleDateString(
    locale === "he" ? dateLocale(locale) : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
  const org =
    snapshot.organizationNames.length > 0
      ? snapshot.organizationNames.join(", ")
      : locale === "he"
        ? t("manager.impact.yourOrg")
        : "Your organization";

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
  drawText(page, "Fathers.com", MARGIN, y, font, 10, FOREST, locale);
  const dateWidth = font.widthOfTextAtSize(shapePdfText(generatedOn, locale), 9);
  drawText(page, generatedOn, PAGE_WIDTH - MARGIN - dateWidth, y, font, 9, MUTED, locale);

  y -= 28;
  drawText(
    page,
    locale === "he" ? t("manager.impact.title") : "Impact Snapshot",
    MARGIN,
    y,
    bold,
    22,
    INK,
    locale
  );
  y -= 18;
  drawText(page, fit(org, bold, 11, PAGE_WIDTH - MARGIN * 2, locale), MARGIN, y, bold, 11, FOREST, DEFAULT_LOCALE);
  y -= 16;
  drawText(
    page,
    locale === "he"
      ? t("manager.impact.scoped")
      : "Organization-scoped. Counts only. No individual names.",
    MARGIN,
    y,
    font,
    9,
    MUTED,
    locale
  );

  const boxWidth = (PAGE_WIDTH - MARGIN * 2 - 12) / 2;
  const boxHeight = 80;
  const metrics =
    locale === "he"
      ? hebrewMetrics(snapshot, t)
      : [
          {
            label: "Fathers enrolled",
            value: String(snapshot.enrolled),
            detail: "Current members in your group",
          },
          {
            label: "Started training",
            value: `${snapshot.startedTrainingPct}%`,
            detail: `${snapshot.startedTraining} of ${snapshot.enrolled} began a session`,
          },
          {
            label: "Completed a session",
            value: `${snapshot.completedOneSessionPct}%`,
            detail: `${snapshot.completedOneSession} of ${snapshot.enrolled} finished at least one`,
          },
          {
            label: "Fully completed",
            value: `${snapshot.fullyCompletedPct}%`,
            detail: `${snapshot.fullyCompleted} of ${snapshot.enrolled} finished a training`,
          },
          {
            label: "Certificates issued",
            value: String(snapshot.certificatesIssued),
            detail: "Certificates sent from your group",
          },
          {
            label: "Currently active",
            value: String(snapshot.activeParticipants),
            detail: `Last activity in the past ${snapshot.periodDays} days`,
          },
        ];

  y -= 20;
  metrics.forEach((metric, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + col * (boxWidth + 12);
    const top = y - row * (boxHeight + 10);
    drawMetric(page, x, top, boxWidth, boxHeight, metric.label, metric.value, metric.detail, font, bold, locale);
  });

  y -= 3 * (boxHeight + 10) + 18;
  drawText(
    page,
    locale === "he" ? t("manager.impact.periodTitle") : "This period vs previous",
    MARGIN,
    y,
    bold,
    12,
    INK,
    locale
  );
  y -= 14;
  drawText(
    page,
    locale === "he"
      ? t("manager.impact.periodCompare", {
          current: snapshot.currentRangeLabel,
          previous: snapshot.previousRangeLabel,
        })
      : `${snapshot.currentRangeLabel} compared with ${snapshot.previousRangeLabel}.`,
    MARGIN,
    y,
    font,
    9,
    MUTED,
    locale
  );

  const trendRows =
    locale === "he"
      ? [
          { label: t("manager.impact.newEnrollments"), count: snapshot.trend.enrolled },
          { label: t("manager.impact.sessionsCompleted"), count: snapshot.trend.sessionsCompleted },
          { label: t("manager.impact.certs"), count: snapshot.trend.certificatesIssued },
        ]
      : [
          { label: "New enrollments", count: snapshot.trend.enrolled },
          { label: "Sessions completed", count: snapshot.trend.sessionsCompleted },
          { label: "Certificates issued", count: snapshot.trend.certificatesIssued },
        ];

  y -= 22;
  for (const row of trendRows) {
    drawText(page, row.label, MARGIN, y, font, 10, INK, locale);
    const value =
      locale === "he"
        ? t("manager.impact.thisPeriod", { n: row.count.current })
        : `${row.count.current} this period`;
    drawText(page, value, MARGIN + 160, y, bold, 10, INK, locale);
    drawText(page, trendLabel(row.count.current, row.count.previous, locale), MARGIN + 280, y, font, 9, MUTED, locale);
    y -= 16;
  }

  if (snapshot.trainings.length > 0) {
    y -= 10;
    drawText(
      page,
      locale === "he" ? t("manager.impact.byTraining") : "By training",
      MARGIN,
      y,
      bold,
      12,
      INK,
      locale
    );
    y -= 16;
    for (const training of snapshot.trainings.slice(0, 4)) {
      drawText(
        page,
        fit(training.title, bold, 10, PAGE_WIDTH - MARGIN * 2, locale),
        MARGIN,
        y,
        bold,
        10,
        INK,
        DEFAULT_LOCALE
      );
      y -= 13;
      drawText(
        page,
        locale === "he"
          ? t("manager.impact.trainingBreakdown", {
              started: training.started,
              one: training.completedOneSession,
              fully: training.fullyCompleted,
            })
          : `${training.started} started · ${training.completedOneSession} completed a session · ${training.fullyCompleted} fully completed`,
        MARGIN,
        y,
        font,
        9,
        MUTED,
        locale
      );
      y -= 16;
    }
  }

  drawText(
    page,
    locale === "he"
      ? t("manager.impact.footer")
      : "Fathers.com  ·  Presence is a skill.  ·  Your organization only.",
    MARGIN,
    36,
    font,
    8,
    MUTED,
    locale
  );

  return doc.save();
}

function hebrewMetrics(snapshot: ImpactSnapshot, t: Translate) {
  return [
    {
      label: t("manager.impact.enrolled"),
      value: String(snapshot.enrolled),
      detail: t("manager.impact.enrolledDetail"),
    },
    {
      label: t("manager.impact.started"),
      value: `${snapshot.startedTrainingPct}%`,
      detail: t("manager.impact.startedDetail", {
        started: snapshot.startedTraining,
        enrolled: snapshot.enrolled,
      }),
    },
    {
      label: t("manager.impact.oneSession"),
      value: `${snapshot.completedOneSessionPct}%`,
      detail: t("manager.impact.oneSessionDetail", {
        count: snapshot.completedOneSession,
        enrolled: snapshot.enrolled,
      }),
    },
    {
      label: t("manager.impact.fully"),
      value: `${snapshot.fullyCompletedPct}%`,
      detail: t("manager.impact.fullyDetail", {
        count: snapshot.fullyCompleted,
        enrolled: snapshot.enrolled,
      }),
    },
    {
      label: t("manager.impact.certs"),
      value: String(snapshot.certificatesIssued),
      detail: t("manager.impact.certsDetail"),
    },
    {
      label: t("manager.impact.active"),
      value: String(snapshot.activeParticipants),
      detail: t("manager.impact.activeDetail", { days: snapshot.periodDays }),
    },
  ];
}
