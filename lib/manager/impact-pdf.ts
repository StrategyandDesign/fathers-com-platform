import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { trendLabel, type ImpactSnapshot } from "@/lib/manager/impact";

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

export async function renderImpactPdf(snapshot: ImpactSnapshot) {
  const doc = await PDFDocument.create();
  doc.setTitle("Fathers.com Impact Snapshot");
  doc.setAuthor("Fathers.com");
  doc.setCreator("Fathers.com");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const generatedOn = new Date(snapshot.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const org =
    snapshot.organizationNames.length > 0
      ? snapshot.organizationNames.join(", ")
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
  page.drawText("Fathers.com", {
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
  page.drawText("Impact Snapshot", {
    x: MARGIN,
    y,
    font: bold,
    size: 22,
    color: INK,
  });
  y -= 18;
  page.drawText(fitText(org, bold, 11, PAGE_WIDTH - MARGIN * 2), {
    x: MARGIN,
    y,
    font: bold,
    size: 11,
    color: FOREST,
  });
  y -= 16;
  page.drawText("Organization-scoped. Ready for a board, funder, or leader.", {
    x: MARGIN,
    y,
    font,
    size: 9,
    color: MUTED,
  });

  const boxWidth = (PAGE_WIDTH - MARGIN * 2 - 12) / 2;
  const boxHeight = 80;
  const metrics = [
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
    drawMetric(page, x, top, boxWidth, boxHeight, metric.label, metric.value, metric.detail, font, bold);
  });

  y -= 3 * (boxHeight + 10) + 18;
  page.drawText("This period vs previous", {
    x: MARGIN,
    y,
    font: bold,
    size: 12,
    color: INK,
  });
  y -= 14;
  page.drawText(
    `${snapshot.currentRangeLabel} compared with ${snapshot.previousRangeLabel}.`,
    {
      x: MARGIN,
      y,
      font,
      size: 9,
      color: MUTED,
    }
  );

  const trendRows = [
    { label: "New enrollments", count: snapshot.trend.enrolled },
    { label: "Sessions completed", count: snapshot.trend.sessionsCompleted },
    { label: "Certificates issued", count: snapshot.trend.certificatesIssued },
  ];

  y -= 22;
  for (const row of trendRows) {
    page.drawText(row.label, {
      x: MARGIN,
      y,
      font,
      size: 10,
      color: INK,
    });
    const value = `${row.count.current} this period`;
    page.drawText(value, {
      x: MARGIN + 160,
      y,
      font: bold,
      size: 10,
      color: INK,
    });
    page.drawText(trendLabel(row.count.current, row.count.previous), {
      x: MARGIN + 280,
      y,
      font,
      size: 9,
      color: MUTED,
    });
    y -= 16;
  }

  if (snapshot.trainings.length > 0) {
    y -= 10;
    page.drawText("By training", {
      x: MARGIN,
      y,
      font: bold,
      size: 12,
      color: INK,
    });
    y -= 16;
    for (const training of snapshot.trainings.slice(0, 4)) {
      page.drawText(fitText(training.title, bold, 10, PAGE_WIDTH - MARGIN * 2), {
        x: MARGIN,
        y,
        font: bold,
        size: 10,
        color: INK,
      });
      y -= 13;
      page.drawText(
        `${training.started} started · ${training.completedOneSession} completed a session · ${training.fullyCompleted} fully completed`,
        {
          x: MARGIN,
          y,
          font,
          size: 9,
          color: MUTED,
        }
      );
      y -= 16;
    }
  }

  page.drawText("Fathers.com  ·  Presence is a skill.  ·  Your organization only.", {
    x: MARGIN,
    y: 36,
    font,
    size: 8,
    color: MUTED,
  });

  return doc.save();
}
