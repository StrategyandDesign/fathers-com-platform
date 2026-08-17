import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import {
  insightFilename,
  insightQuery,
  loadReviewerInsights,
  parseInsightSearchParams,
  rowsToCsv,
} from "@/lib/reviewer/insights";

export const runtime = "nodejs";

function fail(
  message: string,
  filters: ReturnType<typeof parseInsightSearchParams>["filters"]
): never {
  const query = insightQuery(filters, { error: message });
  redirect(query ? `/reviewer?${query}` : `/reviewer?error=${encodeURIComponent(message)}`);
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

  const format = (url.searchParams.get("format") ?? "csv").trim().toLowerCase();
  if (format !== "csv") {
    fail("Export format must be csv.", parsed.filters);
  }

  const insights = await loadReviewerInsights(parsed.filters);
  if (insights.error) {
    fail(insights.error, parsed.filters);
  }

  return new Response(rowsToCsv(insights.rows, parsed.filters.trainingId), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${insightFilename()}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
