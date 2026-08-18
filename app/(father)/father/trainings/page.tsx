import { FatherTrainingCatalogCard, isTrainingInProgress } from "@/components/father/training-catalog-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { loadFatherHome } from "@/lib/father/data";
import type { Session, SessionProgress } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { loadFatherOrgPhotoCovers, resolveTrainingCardCover } from "@/lib/org-photos/data";
import { gatedPartLabel, trainingCoverSlug, trainingPartSubtitle } from "@/lib/trainings/series";
import { cn } from "@/lib/utils";

function cardRank(card: {
  completed: number;
  next: Session | null | undefined;
  nextProgress: SessionProgress | null;
}) {
  if (isTrainingInProgress(card.completed, card.next, card.nextProgress)) return 0;
  if (card.next) return 1;
  return 2;
}

export default async function FatherTrainingsPage() {
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [{ trainingCards }, orgPhotos] = await Promise.all([
    loadFatherHome(user.id),
    loadFatherOrgPhotoCovers(user.id),
  ]);
  const cards = [...trainingCards].sort((left, right) => cardRank(left) - cardRank(right));
  const inProgressCount = cards.filter((card) =>
    isTrainingInProgress(card.completed, card.next, card.nextProgress)
  ).length;
  const openCount = cards.filter((card) => card.next).length;

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
          {t("father.trainings.emptyBody")}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
          {cards.map((card) => {
            const inProgress = isTrainingInProgress(
              card.completed,
              card.next,
              card.nextProgress
            );
            const featured =
              inProgressCount > 0
                ? inProgress && inProgressCount === 1
                : openCount === 1 && Boolean(card.next);

            return (
              <div
                key={card.training.id}
                className={cn((featured || cards.length === 1) && "lg:col-span-2")}
              >
                <FatherTrainingCatalogCard
                  title={card.training.title}
                  description={card.training.description}
                  subtitle={
                    card.training.part_number && card.training.part_total
                      ? card.total === 1
                        ? t("father.trainings.partSubtitleOne", {
                            n: card.training.part_number,
                            total: card.training.part_total,
                          })
                        : t("father.trainings.partSubtitle", {
                            n: card.training.part_number,
                            total: card.training.part_total,
                            sessions: card.total,
                          })
                      : trainingPartSubtitle(card.training, card.total)
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
                  quiet={inProgressCount > 0 && !inProgress}
                  gated={card.gated}
                  gatedLabel={
                    card.gated
                      ? t("father.trainings.gatedPart", { n: gatedPartLabel(card.training) })
                      : null
                  }
                  t={t}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
