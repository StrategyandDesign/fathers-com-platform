import { AssessmentHomeCard } from "@/components/assessments/home-card";
import { CohortNoteCard } from "@/components/father/cohort-note-card";
import { HomeAssessmentCard } from "@/components/father/home-assessment-card";
import { HomePathRow } from "@/components/father/home-path";
import { HomeStreakRow } from "@/components/father/home-streak";
import { SkillUseCard } from "@/components/father/skill-use-card";
import { HomeUpNextCard } from "@/components/father/home-up-next";
import { LeaderMeta } from "@/components/father/leader-meta";
import { StreakNotices } from "@/components/father/streak-notices";
import { Flash } from "@/components/manager/flash";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { loadFatherLeader, loadVisibleCohortNote } from "@/lib/cohort-note/data";
import { requireRole } from "@/lib/auth/session";
import { formatCertificateDate } from "@/lib/certificates/types";
import { pickHomeAssessment, splitHomeRows } from "@/lib/father/home";
import { loadFatherHome } from "@/lib/father/data";
import { loadFatherStreakHome } from "@/lib/father/streak-store";
import { hasStartedTrainingWork, hasTrainingOverview, trainingContinueHref } from "@/lib/father/training-door";
import { type SessionProgress } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { loadFatherParticipationMode } from "@/lib/participation-data";
import { participationCopyKey } from "@/lib/participation";
import { scheduleDueReminderFlush } from "@/lib/jobs/flush-due-work";
import {
  loadFatherOrgPhotoCovers,
  resolveHomeHeroCover,
  resolveHomeProfileCover,
  resolveTrainingCardCover,
} from "@/lib/org-photos/data";
import { trainingCoverSlug } from "@/lib/trainings/series";
import { cn } from "@/lib/utils";

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
  searchParams: Promise<{ done?: string; error?: string; notice?: string }>;
}) {
  const { done, error, notice } = await searchParams;
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  scheduleDueReminderFlush();
  const [
    { pathCards, trainingCards, next, profile, draft, certificates, skillUsePrompt },
    customAssignments,
    orgPhotos,
    streak,
    leader,
    cohortNote,
    participationMode,
  ] = await Promise.all([
    loadFatherHome(user.id),
    loadFatherAssignments(user.id),
    loadFatherOrgPhotoCovers(user.id),
    loadFatherStreakHome(user.id),
    loadFatherLeader(user.id),
    loadVisibleCohortNote(user.id),
    loadFatherParticipationMode(user.id),
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
  const shelves = splitHomeRows(trainingCards, next?.training.id);
  const withCover = <T extends (typeof trainingCards)[number]>(cards: T[]) =>
    cards.map((card) => ({
      ...card,
      coverSrc: resolveTrainingCardCover(
        trainingCoverSlug(card.training),
        orgPhotos.trainingUrls[trainingCoverSlug(card.training)],
        orgPhotos.photoPack
      ),
    }));
  const path = withCover(shelves.path);
  const available = withCover(shelves.trainings);
  const completed = withCover(shelves.completed);
  const earned = certificates.map((row) => ({
    id: row.id,
    title:
      trainingCards.find((card) => card.training.id === row.training_id)?.training.title ??
      t("account.certificates"),
    completedOn: formatCertificateDate(row.issued_at),
    serialNumber: row.serial_number,
  }));
  const heroCover = next
    ? resolveHomeHeroCover(next.session.session_number, orgPhotos.heroUrl, orgPhotos.photoPack)
    : null;
  const profileCover = resolveHomeProfileCover(orgPhotos.profileUrl, orgPhotos.photoPack);
  const pair = Boolean(next && assessment);

  const startWithOverview = Boolean(
    next &&
      hasTrainingOverview(next.training) &&
      !hasStartedTrainingWork(nextCompleted, next.progress, nextCard?.sessionDots)
  );
  const upNext = next ? (
    <HomeUpNextCard
      href={trainingContinueHref({
        training: next.training,
        next: next.session,
        nextProgress: next.progress,
        completed: nextCompleted,
        sessionDots: nextCard?.sessionDots,
      })}
      trainingTitle={next.training.title}
      sessionTitle={next.session.title}
      subtitle={next.session.keyline}
      durationSeconds={next.session.duration_seconds}
      continueSession={nextInProgress}
      startWithOverview={startWithOverview}
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
        {t(participationCopyKey(participationMode, "father.home.nothingAssignedBody"))}
      </p>
    </section>
  ) : null;

  const assessmentCard = assessment ? (
    assessment.kind === "custom" ? (
      <HomeAssessmentCard assessment={assessment} coverSrc={profileCover} t={t} />
    ) : (
      <div className="flex h-full min-w-0 flex-col gap-3">
        <p className={eyebrowClassName}>{t("father.profile.keystone")}</p>
        <AssessmentHomeCard
          className="min-h-0 flex-1"
          coverSrc={profileCover}
          profile={assessment.kind === "keystone-result" ? assessment.profile : null}
          draft={assessment.kind === "keystone-draft" ? assessment.draft : null}
          hideEyebrow
        />
      </div>
    )
  ) : null;

  return (
    <div
      className={cn(
        "mx-auto w-full space-y-6 sm:space-y-8",
        pair ||
          (path.length > 0 && available.length > 0) ||
          ((path.length > 0 || available.length > 0) &&
            (completed.length > 0 || earned.length > 0))
          ? "max-w-5xl"
          : "max-w-xl"
      )}
    >
      {leader ? (
        <LeaderMeta name={leader.name} avatarUrl={leader.avatarUrl} t={t} />
      ) : null}
      {cohortNote ? (
        <CohortNoteCard
          groupId={cohortNote.groupId}
          body={cohortNote.body}
          updatedAt={cohortNote.updatedAt}
          locale={locale}
          t={t}
        />
      ) : null}
      <Flash error={error} notice={notice} />
      <StreakNotices notices={streak.notices} />
      <HomeStreakRow
        weeks={streak.currentWeeks}
        longestWeeks={streak.longestWeeks}
        freezesRemaining={streak.freezesRemaining}
        justFinished={justFinished}
      />
      {skillUsePrompt ? (
        <SkillUseCard
          sessionId={skillUsePrompt.sessionId}
          skill={skillUsePrompt.skill}
          reported={null}
          returnTo="home"
        />
      ) : null}

      {pair ? (
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(14rem,1fr)]">
          {upNext}
          {assessmentCard}
        </div>
      ) : (
        <>
          {upNext}
          {assessmentCard}
        </>
      )}
      <HomePathRow
        path={path}
        trainings={available}
        completed={completed}
        earned={earned}
        t={t}
      />
    </div>
  );
}
