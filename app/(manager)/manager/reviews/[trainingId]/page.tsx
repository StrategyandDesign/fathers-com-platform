import Link from "next/link";
import { notFound } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import {
  ReviewDecisionForms,
  ReviewStatusBadge,
} from "@/components/manager/review-decision-forms";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { youtubeEmbedUrl } from "@/lib/father/types";
import { formatShortDate, getI18n } from "@/lib/i18n/server";
import { loadReviewDetail } from "@/lib/manager/reviews";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerTrainingReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ trainingId: string }>;
  searchParams: Promise<{ error?: string; notice?: string; group?: string }>;
}) {
  const { trainingId } = await params;
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const { t, locale } = await getI18n();
  const detail = await loadReviewDetail(user.id, trainingId, flash.group);

  if (!detail) {
    notFound();
  }

  const { review, training, groupName, sessions, otherGroups } = detail;
  const catalog = !review;
  const previewing = review?.status === "pending";
  const declined = review?.status === "declined";

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager" className={interactiveLinkClassName}>
          {t("manager.reviewDetail.dashboard")}
        </Link>
        <span className="text-white/20">|</span>
        <Link href="/manager/trainings" className={interactiveLinkClassName}>
          {t("manager.trainings.title")}
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0">{training.title}</span>
      </p>
      <Flash error={flash.error} notice={flash.notice} />

      {catalog ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <p className="font-medium">{t("manager.reviewDetail.catalogTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.reviewDetail.catalogLead")}
          </p>
        </div>
      ) : previewing ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 sm:px-5">
          <p className="font-medium">{t("manager.reviewDetail.previewTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.reviewDetail.previewLead", { org: groupName })}
          </p>
        </div>
      ) : declined ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <p className="font-medium">{t("manager.reviewDetail.declinedTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.reviewDetail.declinedLead")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <p className="font-medium">{t("manager.reviewDetail.availableTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.reviewDetail.availableLead")}
          </p>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {training.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {(() => {
                const sessionsLabel =
                  sessions.length === 1
                    ? t("manager.dashboard.sessionOne")
                    : t("manager.dashboard.sessionMany", { count: sessions.length });
                const source = training.attribution
                  ? t("manager.trainings.fromSource", { name: training.attribution })
                  : null;
                return [sessionsLabel, otherGroups.length > 0 ? groupName : null, source]
                  .filter(Boolean)
                  .join(" · ");
              })()}
            </p>
          </div>
          {review ? <ReviewStatusBadge status={review.status} /> : null}
        </div>
        {training.description ? (
          <p className="mt-4 text-sm text-muted-foreground">{training.description}</p>
        ) : null}
        {review?.decided_at ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {review.status === "accepted" ? t("manager.reviews.accepted") : t("manager.reviews.declined")}{" "}
            {formatShortDate(review.decided_at, locale)}
            {review.status === "declined" && review.decline_reason
              ? ` · ${review.decline_reason}`
              : ""}
          </p>
        ) : null}
        {review ? (
          <div className="mt-6 border-t border-border pt-6">
            <ReviewDecisionForms
              trainingId={training.id}
              groupId={review.group_id}
              status={review.status}
              declineReason={review.decline_reason}
            />
          </div>
        ) : (
          <div className="mt-6 border-t border-border pt-6">
            <Link
              href="/manager/trainings#cohort"
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              {t("manager.reviewDetail.assignFromTrainings")}
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.reviewDetail.sessions")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.reviewDetail.sessionsLead")}
          </p>
        </div>
        {sessions.length === 0 ? (
          <EmptyState title={t("manager.reviewDetail.noSessionsTitle")}>
            {t("manager.reviewDetail.noSessionsBody")}
          </EmptyState>
        ) : (
          <ol className="space-y-4">
            {sessions.map((session) => {
              const embed = youtubeEmbedUrl(session.video_url);
              return (
                <li
                  key={session.id}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="p-4 sm:p-6">
                    <p className="text-sm text-muted-foreground">
                      {t("manager.reviewDetail.sessionN", { n: session.session_number })}
                    </p>
                    <h3 className="mt-1 font-heading text-lg font-semibold">
                      {session.title}
                    </h3>
                    {session.keyline ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {session.keyline}
                      </p>
                    ) : null}
                  </div>
                  {embed ? (
                    <div className="aspect-video border-t border-border bg-black">
                      <iframe
                        className="h-full w-full"
                        src={embed}
                        title={session.title}
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
