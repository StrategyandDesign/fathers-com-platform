import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

const FONT_DIR = path.join(process.cwd(), "lib/pdf/fonts");

export function shapePdfText(text: string, locale: Locale = DEFAULT_LOCALE) {
  if (locale !== "he") return text;
  return text.replace(/[\u0590-\u05FF][\u0590-\u05FF\s]*/g, (block) => [...block].reverse().join(""));
}

export function fitPdfText(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "…";
  let cut = text;
  while (cut.length > 0 && font.widthOfTextAtSize(cut + ellipsis, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}${ellipsis}`;
}

export async function embedExportFonts(doc: PDFDocument, locale: Locale) {
  if (locale !== "he") {
    return {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
    };
  }

  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(FONT_DIR, "Heebo-Regular.ttf")),
    readFile(path.join(FONT_DIR, "Heebo-SemiBold.ttf")),
  ]);
  doc.registerFontkit(fontkit);
  return {
    regular: await doc.embedFont(regularBytes, { subset: true }),
    bold: await doc.embedFont(boldBytes, { subset: true }),
  };
}
