import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { insightQuery, parseInsightSearchParams } from "@/lib/reviewer/insights";
import { renderReviewerSummaryPdf } from "@/lib/reviewer/summary-pdf";
import { loadReviewerImpactSummary, summaryFilename } from "@/lib/reviewer/summary";
import { allowRequestRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function fail(
  message: string,
  filters: ReturnType<typeof parseInsightSearchParams>["filters"]
): never {
  const query = insightQuery(filters, { error: message });
  redirect(
    query ? `/reviewer/summary?${query}` : `/reviewer/summary?error=${encodeURIComponent(message)}`
  );
}

export async function GET(request: Request) {
  await requireRole("reviewer");
  const url = new URL(request.url);
  const parsed = parseInsightSearchParams({
    group_id: url.searchParams.get("group_id") ?? undefined,
    training_id: url.searchParams.get("training_id") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  if (parsed.error) {
    fail(parsed.error, parsed.filters);
  }

  if ((url.searchParams.get("format") ?? "pdf").trim().toLowerCase() !== "pdf") {
    fail("Export format must be pdf.", parsed.filters);
  }

  if (!allowRequestRateLimit("reviewer.summary_export", request)) {
    fail("Too many summary downloads. Try again in a few minutes.", parsed.filters);
  }

  try {
    const { insights, summary, certificateError } = await loadReviewerImpactSummary(
      parsed.filters
    );
    if (insights.error) {
      fail(insights.error, parsed.filters);
    }
    if (certificateError) {
      fail(certificateError, parsed.filters);
    }
    const bytes = await renderReviewerSummaryPdf(summary);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${summaryFilename()}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    fail(
      error instanceof Error ? error.message : "Could not generate the summary PDF.",
      parsed.filters
    );
  }
}
