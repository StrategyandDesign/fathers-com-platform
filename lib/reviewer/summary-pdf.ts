import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { ReviewerImpactSummary } from "@/lib/reviewer/summary";

const FOREST = rgb(0x32 / 255, 0x66 / 255, 0x38 / 255);
const INK = rgb(0x14 / 255, 0x12 / 255, 0x10 / 255);
const MUTED = rgb(0x5c / 255, 0x56 / 255, 0x48 / 255);
const RULE = rgb(0xe6 / 255, 0xe2 / 255, 0xd8 / 255);
const PAPER = rgb(0.99, 0.98, 0.96);

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "…";
  let cut = text;
  while (cut.length > 0 && font.widthOfTextAtSize(cut + ellipsis, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}${ellipsis}`;
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
  bold: PDFFont
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: RULE,
    borderWidth: 1,
  });
  page.drawText(label.toUpperCase(), {
    x: x + 12,
    y: y - 22,
    font,
    size: 8,
    color: MUTED,
  });
  page.drawText(value, {
    x: x + 12,
    y: y - 48,
    font: bold,
    size: 22,
    color: INK,
  });
  page.drawText(fitText(detail, font, 9, width - 24), {
    x: x + 12,
    y: y - 68,
    font,
    size: 9,
    color: MUTED,
  });
}

export async function renderReviewerSummaryPdf(summary: ReviewerImpactSummary) {
  const doc = await PDFDocument.create();
  doc.setTitle("Fathers.com Impact Summary");
  doc.setAuthor("Fathers.com");
  doc.setCreator("Fathers.com");
  doc.setSubject("Anonymized program outcomes. No personal data.");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const generatedOn = new Date(summary.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
  page.drawText("Fathers.com  ·  Anonymized", {
    x: MARGIN,
    y,
    font,
    size: 10,
    color: FOREST,
  });
  page.drawText(generatedOn, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(generatedOn, 9),
    y,
    font,
    size: 9,
    color: MUTED,
  });

  y -= 28;
  page.drawText("Impact Summary", {
    x: MARGIN,
    y,
    font: bold,
    size: 22,
    color: INK,
  });
  y -= 16;
  page.drawText("Program outcomes for a board, funder, or leadership update.", {
    x: MARGIN,
    y,
    font,
    size: 9,
    color: MUTED,
  });
  y -= 14;
  page.drawText("Counts only. No names, emails, or certificate serials.", {
    x: MARGIN,
    y,
    font,
    size: 9,
    color: MUTED,
  });

  y -= 22;
  page.drawText("Filters applied", {
    x: MARGIN,
    y,
    font: bold,
    size: 11,
    color: INK,
  });
  y -= 14;
  for (const line of summary.filterLines) {
    page.drawText(fitText(line, font, 9, PAGE_WIDTH - MARGIN * 2), {
      x: MARGIN,
      y,
      font,
      size: 9,
      color: MUTED,
    });
    y -= 12;
  }

  const boxWidth = (PAGE_WIDTH - MARGIN * 2 - 12) / 2;
  const boxHeight = 80;
  const metrics = [
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
      bold
    );
  });

  y -= 3 * (boxHeight + 10) + 8;

  if (summary.trend) {
    page.drawText("Period comparison", {
      x: MARGIN,
      y,
      font: bold,
      size: 12,
      color: INK,
    });
    y -= 14;
    const suffix = summary.trend.unit === "completion rate" ? "%" : ` ${summary.trend.unit}`;
    page.drawText(
      fitText(
        `${summary.trend.leftLabel}: ${summary.trend.left}${suffix}   ·   ${summary.trend.rightLabel}: ${summary.trend.right}${suffix}`,
        font,
        9,
        PAGE_WIDTH - MARGIN * 2
      ),
      { x: MARGIN, y, font, size: 9, color: MUTED }
    );
    y -= 20;
  }

  if (summary.groups.length > 0) {
    page.drawText("Group comparison", {
      x: MARGIN,
      y,
      font: bold,
      size: 12,
      color: INK,
    });
    y -= 16;
    page.drawText("Group", { x: MARGIN, y, font, size: 8, color: MUTED });
    page.drawText("Enrolled", { x: MARGIN + 120, y, font, size: 8, color: MUTED });
    page.drawText("Started", { x: MARGIN + 200, y, font, size: 8, color: MUTED });
    page.drawText("One session", { x: MARGIN + 280, y, font, size: 8, color: MUTED });
    page.drawText("Completed", { x: MARGIN + 380, y, font, size: 8, color: MUTED });
    y -= 14;
    for (const group of summary.groups.slice(0, 8)) {
      page.drawText(fitText(group.label, bold, 10, 110), {
        x: MARGIN,
        y,
        font: bold,
        size: 10,
        color: INK,
      });
      page.drawText(String(group.enrolled), {
        x: MARGIN + 120,
        y,
        font,
        size: 10,
        color: INK,
      });
      page.drawText(`${group.startedPct}%`, {
        x: MARGIN + 200,
        y,
        font,
        size: 10,
        color: INK,
      });
      page.drawText(`${group.oneSessionPct}%`, {
        x: MARGIN + 280,
        y,
        font,
        size: 10,
        color: INK,
      });
      page.drawText(`${group.fullyCompletedPct}%`, {
        x: MARGIN + 380,
        y,
        font,
        size: 10,
        color: INK,
      });
      y -= 14;
    }
  }

  page.drawText(
    "Fathers.com  ·  Presence is a skill.  ·  Anonymized counts only.",
    {
      x: MARGIN,
      y: 36,
      font,
      size: 8,
      color: MUTED,
    }
  );

  return doc.save();
}
