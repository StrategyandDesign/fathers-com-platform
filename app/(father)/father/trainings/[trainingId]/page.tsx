import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { TrainingHandoutLinks } from "@/components/father/training-handout-links";
import { TrainingOverviewFilm } from "@/components/father/training-overview-film";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { loadFatherHome } from "@/lib/father/data";
import { hasStartedTrainingWork, hasTrainingOverview } from "@/lib/father/training-door";
import { continueHref, sessionFilmPath } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { loadFatherOrgPhotoCovers, resolveTrainingCardCover } from "@/lib/org-photos/data";
import { loadTrainingHandouts } from "@/lib/training-handouts/data";
import { trainingCoverSlug } from "@/lib/trainings/series";
import { homePrimaryCtaClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherTrainingOverviewPage({
  params,
}: {
  params: Promise<{ trainingId: string }>;
}) {
  const { trainingId } = await params;
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const [{ trainingCards }, orgPhotos, handouts] = await Promise.all([
    loadFatherHome(user.id),
    loadFatherOrgPhotoCovers(user.id),
    loadTrainingHandouts(trainingId),
  ]);
  const card = trainingCards.find((row) => row.training.id === trainingId);

  if (!card) {
    notFound();
  }

  if (hasStartedTrainingWork(card.completed, card.nextProgress, card.sessionDots)) {
    redirect(card.next ? continueHref(card.next.id, card.nextProgress) : "/father/trainings");
  }

  if (!hasTrainingOverview(card.training)) {
    redirect(card.next ? sessionFilmPath(card.next.id) : "/father/trainings");
  }

  const sessionHref = card.next ? sessionFilmPath(card.next.id) : null;
  const coverSrc = resolveTrainingCardCover(
    trainingCoverSlug(card.training),
    orgPhotos.trainingUrls[trainingCoverSlug(card.training)],
    orgPhotos.photoPack
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/father/trainings"
        className={cn(
          "inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground",
          interactiveLinkClassName
        )}
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("father.trainings.backToTrainings")}
      </Link>

      <header className="space-y-2">
        <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase sm:text-xs sm:tracking-[0.18em]">
          {t("father.trainings.overviewEyebrow")}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {card.training.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("father.trainings.overviewLead")}
        </p>
      </header>

      <TrainingOverviewFilm
        url={card.training.overview_video_url}
        title={t("father.trainings.overviewTitle", { title: card.training.title })}
        coverSrc={coverSrc}
        language={locale}
        badge={t("father.trainings.overviewBadge")}
        notSession={t("father.trainings.overviewNotSession")}
      />

      <TrainingHandoutLinks handouts={handouts} t={t} layout="card" />

      {card.training.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {card.training.description}
        </p>
      ) : null}

      {sessionHref && card.next ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t("father.trainings.overviewThen")}
          </p>
          <p className="font-heading text-lg font-semibold tracking-tight">
            {t("father.trainings.nextSession", { title: card.next.title })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("father.trainings.sessionOf", {
              n: card.next.session_number,
              total: card.total,
            })}
          </p>
          <Link
            href={sessionHref}
            className={cn(buttonVariants({ size: "lg" }), homePrimaryCtaClassName)}
          >
            {card.completed > 0
              ? t("father.trainings.openSession", { n: card.next.session_number })
              : t("father.trainings.startSessionN", { n: card.next.session_number })}
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("father.trainings.trainingComplete")}</p>
      )}
    </div>
  );
}
