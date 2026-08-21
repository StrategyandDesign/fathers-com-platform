import { FatherTrainingCatalogCard, isTrainingInProgress } from "@/components/father/training-catalog-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { loadFatherHome } from "@/lib/father/data";
import { isHomeTrainingComplete } from "@/lib/father/home";
import { hasStartedTrainingWork, hasTrainingOverview } from "@/lib/father/training-door";
import { sessionFilmPath, trainingOverviewPath, type Session, type SessionProgress } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import type { Translate } from "@/lib/i18n/translate";
import { loadFatherParticipationMode } from "@/lib/participation-data";
import { participationCopyKey } from "@/lib/participation";
import { loadFatherOrgPhotoCovers, resolveTrainingCardCover, type FatherOrgPhotoCovers } from "@/lib/org-photos/data";
import { loadTrainingHandoutsByIds, type TrainingHandout } from "@/lib/training-handouts/data";
import { trainingCoverSlug } from "@/lib/trainings/series";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

type TrainingCard = Awaited<ReturnType<typeof loadFatherHome>>["trainingCards"][number];

function cardRank(card: {
  completed: number;
  next: Session | null | undefined;
  nextProgress: SessionProgress | null;
}) {
  if (isTrainingInProgress(card.completed, card.next, card.nextProgress)) return 0;
  if (card.next) return 1;
  return 2;
}

function CatalogCard({
  card,
  featured,
  sideBySide,
  quiet,
  orgPhotos,
  handouts,
  t,
}: {
  card: TrainingCard;
  featured: boolean;
  sideBySide?: boolean;
  quiet: boolean;
  orgPhotos: FatherOrgPhotoCovers;
  handouts: TrainingHandout[];
  t: Translate;
}) {
  const showOverview =
    hasTrainingOverview(card.training) &&
    !hasStartedTrainingWork(card.completed, card.nextProgress, card.sessionDots);

  return (
    <FatherTrainingCatalogCard
      title={card.training.title}
      description={card.training.description}
      subtitle={
        card.total === 1
          ? t("father.home.sessionOne")
          : t("father.home.sessionMany", { n: card.total })
      }
      coverSrc={resolveTrainingCardCover(
        trainingCoverSlug(card.training),
        orgPhotos.trainingUrls[trainingCoverSlug(card.training)],
        orgPhotos.photoPack
      )}
      completed={card.completed}
      total={card.total}
      next={card.next}
      nextProgress={card.nextProgress}
      sessionDots={card.sessionDots}
      certificateId={card.certificate?.id ?? null}
      featured={featured}
      sideBySide={sideBySide}
      quiet={quiet}
      gated={false}
      gatedLabel={null}
      hrefOverride={card.next ? sessionFilmPath(card.next.id) : null}
      hasOverview={showOverview}
      overviewHref={showOverview ? trainingOverviewPath(card.training.id) : null}
      overviewUrl={showOverview ? card.training.overview_video_url : null}
      showOverviewSlot={showOverview}
      handouts={handouts}
      t={t}
    />
  );
}

function CatalogGroup({
  title,
  cards,
  featuredId,
  inProgressCount = 0,
  sideBySide = false,
  orgPhotos,
  handoutsByTraining,
  t,
}: {
  title: string;
  cards: TrainingCard[];
  featuredId?: string | null;
  inProgressCount?: number;
  sideBySide?: boolean;
  orgPhotos: FatherOrgPhotoCovers;
  handoutsByTraining: Map<string, TrainingHandout[]>;
  t: Translate;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-4 p-4 sm:p-5">
      <p className={eyebrowClassName}>{title}</p>
      <div
        className={cn(
          "grid gap-4 sm:gap-5",
          !sideBySide && "lg:grid-cols-2 lg:gap-6"
        )}
      >
        {cards.map((card) => {
          const inProgress = isTrainingInProgress(
            card.completed,
            card.next,
            card.nextProgress
          );
          const featured = featuredId === card.training.id;
          return (
            <div
              key={card.training.id}
              className={cn(
                (featured || cards.length === 1 || sideBySide) && "lg:col-span-2"
              )}
            >
              <CatalogCard
                card={card}
                featured={featured}
                sideBySide={sideBySide}
                quiet={inProgressCount > 0 && !inProgress}
                orgPhotos={orgPhotos}
                handouts={handoutsByTraining.get(card.training.id) ?? []}
                t={t}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function FatherTrainingsPage() {
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [{ trainingCards }, orgPhotos, participationMode] = await Promise.all([
    loadFatherHome(user.id),
    loadFatherOrgPhotoCovers(user.id),
    loadFatherParticipationMode(user.id),
  ]);
  const handoutsByTraining = await loadTrainingHandoutsByIds(
    trainingCards.map((card) => card.training.id)
  );
  const cards = [...trainingCards].sort((left, right) => cardRank(left) - cardRank(right));
  const available = cards.filter((card) => !isHomeTrainingComplete(card));
  const completed = cards.filter((card) => isHomeTrainingComplete(card));
  const inProgress = available.filter((card) =>
    isTrainingInProgress(card.completed, card.next, card.nextProgress)
  );
  const featuredId =
    inProgress.length === 1
      ? inProgress[0]?.training.id
      : inProgress.length === 0 && available.length === 1
        ? available[0]?.training.id
        : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("father.trainings.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("father.trainings.lead")}
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title={t("father.trainings.emptyTitle")}
          actionHref="/father"
          actionLabel={t("father.trainings.backHome")}
        >
          {t(participationCopyKey(participationMode, "father.trainings.emptyBody"))}
        </EmptyState>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-border",
            available.length > 0 && completed.length > 0 && "divide-y divide-border"
          )}
        >
          <CatalogGroup
            title={t("father.trainings.available")}
            cards={available}
            featuredId={featuredId}
            inProgressCount={inProgress.length}
            orgPhotos={orgPhotos}
            handoutsByTraining={handoutsByTraining}
            t={t}
          />
          <CatalogGroup
            title={t("father.trainings.completedGroup")}
            cards={completed}
            sideBySide
            orgPhotos={orgPhotos}
            handoutsByTraining={handoutsByTraining}
            t={t}
          />
        </div>
      )}
    </div>
  );
}
