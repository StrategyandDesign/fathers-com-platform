import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { resolveManagerExportLocale } from "@/lib/i18n/org-locale";
import { allowRequestRateLimit } from "@/lib/security/rate-limit";
import { renderReportPdf } from "@/lib/manager/report-pdf";
import {
  loadManagerReport,
  parseReportSearchParams,
  reportFilename,
  reportQuery,
  rowsToCsv,
} from "@/lib/manager/reports";

export const runtime = "nodejs";

function fail(
  message: string,
  filters: ReturnType<typeof parseReportSearchParams>["filters"]
): never {
  const query = reportQuery(filters, { error: message });
  redirect(query ? `/manager/reports?${query}` : `/manager/reports?error=${encodeURIComponent(message)}`);
}

export async function GET(request: Request) {
  const { user } = await requireRole("manager");
  const url = new URL(request.url);
  const parsed = parseReportSearchParams({
    training_id: url.searchParams.get("training_id") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  if (parsed.error) {
    fail(parsed.error, parsed.filters);
  }

  const format = (url.searchParams.get("format") ?? "csv").trim().toLowerCase();
  if (format !== "csv" && format !== "pdf") {
    fail("Export format must be csv or pdf.", parsed.filters);
  }

  if (!allowRequestRateLimit("manager.reports_export", request)) {
    fail("Too many downloads. Try again in a few minutes.", parsed.filters);
  }

  const report = await loadManagerReport(user.id, parsed.filters);
  if (report.error) {
    fail(report.error, parsed.filters);
  }

  const locale = await resolveManagerExportLocale(user.id);

  if (format === "csv") {
    return new Response(rowsToCsv(report.rows, locale), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${reportFilename("csv")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  try {
    const bytes = await renderReportPdf(report.rows, parsed.filters, report.trainings, locale);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFilename("pdf")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not generate the PDF.", parsed.filters);
  }
}
