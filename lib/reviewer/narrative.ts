import type { Translate } from "@/lib/i18n/translate";
import type { ReviewerImpactSummary } from "@/lib/reviewer/summary";

export function draftReviewerFunderNarrative(
  summary: ReviewerImpactSummary,
  t: Translate
) {
  if (summary.totalParticipants === 0) {
    return t("reviewer.summary.narrativeEmpty");
  }

  const parts = [
    t("reviewer.summary.narrativeOpen", {
      participants: summary.totalParticipants,
    }),
    t("reviewer.summary.narrativeStart", {
      startedPct: summary.startedPct,
      startedCount: summary.startedCount,
      total: summary.totalParticipants,
    }),
    t("reviewer.summary.narrativeProgress", {
      onePct: summary.oneSessionPct,
      oneCount: summary.oneSessionCount,
      fullyPct: summary.fullyCompletedPct,
      fullyCount: summary.fullyCompletedCount,
    }),
    t("reviewer.summary.narrativeCerts", {
      certs: summary.certificatesIssued,
    }),
  ];

  if (summary.trend) {
    parts.push(
      t("reviewer.summary.narrativeTrendCompletion", {
        left: summary.trend.left,
        right: summary.trend.right,
      })
    );
  }

  parts.push(t("reviewer.summary.narrativeClose"));
  return parts.join(" ");
}
