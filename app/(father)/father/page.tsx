import { HomeAssessmentCard } from "@/components/father/home-assessment-card";
import { HomeEarnedRow } from "@/components/father/home-earned";
import { HomePathRow } from "@/components/father/home-path";
import { HomeStreakRow } from "@/components/father/home-streak";
import { HomeUpNextCard } from "@/components/father/home-up-next";
import { StreakNotices } from "@/components/father/streak-notices";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { pickHomeAssessment, sortHomePath } from "@/lib/father/home";
import { loadFatherHome } from "@/lib/father/data";
import { loadFatherStreakHome } from "@/lib/father/streak-store";
import { continueHref, type SessionProgress } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import {
  loadFatherOrgPhotoCovers,
  resolveHomeHeroCover,
  resolveTrainingCardCover,
} from "@/lib/org-photos/data";
import { trainingCoverSlug } from "@/lib/trainings/series";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

function sessionInProgress(progress: SessionProgress | null) {
  if (!progress) return false;
  return (
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}

export default async function FatherHomePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [{ pathCards, trainingCards, next, profile, draft, certificates }, customAssignments, orgPhotos, streak] =
    await Promise.all([
      loadFatherHome(user.id),
      loadFatherAssignments(user.id),
      loadFatherOrgPhotoCovers(user.id),
      loadFatherStreakHome(user.id),
    ]);

  const nextCard = next
    ? pathCards.find((card) => card.training.id === next.training.id)
    : undefined;
  const justFinished = Boolean(
    done && pathCards.some((card) => card.sessionDots.some((dot) => dot.id === done && dot.done))
  );
  const nextCompleted = nextCard?.completed ?? 0;
  const nextTotal = nextCard?.total ?? next?.training.session_count ?? 0;
  const nextInProgress = sessionInProgress(next?.progress ?? null);
  const assessment = pickHomeAssessment({
    assignments: customAssignments,
    profile,
    draft,
  });
  const path = sortHomePath(pathCards, next?.training.id).map((card) => ({
    ...card,
    coverSrc: resolveTrainingCardCover(
      trainingCoverSlug(card.training),
      orgPhotos.trainingUrls[trainingCoverSlug(card.training)],
      orgPhotos.photoPack
    ),
  }));
  const earned = certificates.map((row) => ({
    id: row.id,
    title:
      trainingCards.find((card) => card.training.id === row.training_id)?.training.title ??
      t("account.certificates"),
  }));
  const heroCover = next
    ? resolveHomeHeroCover(next.session.session_number, orgPhotos.heroUrl, orgPhotos.photoPack)
    : null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 sm:space-y-5">
      <StreakNotices notices={streak.notices} />
      <HomeStreakRow
        weeks={streak.currentWeeks}
        longestWeeks={streak.longestWeeks}
        freezesRemaining={streak.freezesRemaining}
        grid={streak.grid}
        justFinished={justFinished}
      />

      {next ? (
        <HomeUpNextCard
          href={continueHref(next.session.id, next.progress)}
          trainingTitle={next.training.title}
          sessionTitle={next.session.title}
          subtitle={next.session.keyline}
          durationSeconds={next.session.duration_seconds}
          continueSession={nextInProgress}
          completed={nextCompleted}
          total={nextTotal}
          justFinished={justFinished}
          coverSrc={heroCover}
          t={t}
        />
      ) : pathCards.length === 0 ? (
        <section className="min-w-0 space-y-2">
          <p className={eyebrowClassName}>{t("father.home.upNext")}</p>
          <h1 className="font-heading text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {t("father.home.nothingAssigned")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("father.home.nothingAssignedBody")}
          </p>
        </section>
      ) : null}

      {assessment ? <HomeAssessmentCard assessment={assessment} t={t} /> : null}
      <HomePathRow cards={path} t={t} />
      <HomeEarnedRow marks={earned} t={t} />
    </div>
  );
}
