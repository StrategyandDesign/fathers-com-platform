import { cookies } from "next/headers";
import Link from "next/link";

import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { CoverPhoto } from "@/components/brand/cover";
import { FirstVisitIntro } from "@/components/father/first-visit-intro";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { takeHref } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import { sessionCover } from "@/lib/brand/photos";
import { startProfile } from "@/lib/father/profile-actions";
import { loadFatherHome } from "@/lib/father/data";
import {
  FATHERS_INTRO_SEEN_KEY,
  isFathersIntroSeenValue,
} from "@/lib/father/intro-seen";
import { PROFILE_QUESTION_COUNT, firstUnanswered } from "@/lib/father/questions";
import { continueHref, type SessionProgress } from "@/lib/father/types";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

const profileReminder =
  "Your Profile gives you a clearer picture of your fathering strengths.";

function sessionInProgress(progress: SessionProgress | null) {
  if (!progress) return false;
  return (
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}

export default async function FatherHomePage() {
  const { user } = await requireRole("father");
  const { trainingCards, next, profile, draft } = await loadFatherHome(user.id);
  const customAssignments = await loadFatherAssignments(user.id);

  const nextCard = next
    ? trainingCards.find((card) => card.training.id === next.training.id)
    : undefined;
  const nextCompleted = nextCard?.completed ?? 0;
  const nextTotal = nextCard?.total ?? next?.training.session_count ?? 0;
  const nextPercent =
    next && nextTotal > 0 ? Math.round((nextCompleted / nextTotal) * 100) : 0;
  const hasTraining = trainingCards.length > 0;
  const profileNeedsAction = !profile;
  const profileIsPrimary = !next && profileNeedsAction;
  const pendingAssessment = customAssignments.find(
    (item) => item.assignment.status !== "completed"
  );
  const assessmentIsPrimary = !next && !profileNeedsAction && Boolean(pendingAssessment);
  const issuedCertificates = trainingCards.filter((card) => card.certificate);
  const nextInProgress = sessionInProgress(next?.progress ?? null);
  const neverStarted = Boolean(next) && nextCompleted === 0 && !nextInProgress;
  const introSeen = isFathersIntroSeenValue(
    (await cookies()).get(FATHERS_INTRO_SEEN_KEY)?.value
  );
  const showFirstVisitIntro = neverStarted && !introSeen;
  const heroLabel = neverStarted
    ? "Start Here"
    : nextInProgress
      ? "Continue Training"
      : "Up Next";
  const continueLabel = nextInProgress ? "Continue session" : "Start this session";
  const profileResumeAt = draft ? firstUnanswered(draft.answers) : 1;
  const profileContinueHref = `/father/profile/take?q=${profileResumeAt}`;

  const emptyEyebrow = hasTraining
    ? trainingCards.length === 1
      ? trainingCards[0].training.title
      : "All sessions complete"
    : "No training assigned yet";
  const emptyTitle = hasTraining
    ? "You’re caught up"
    : profileIsPrimary
      ? draft
        ? "Continue your Profile"
        : "Take your Profile"
      : assessmentIsPrimary
        ? (pendingAssessment?.assessment.title ?? "Take this assessment")
        : "Waiting on your manager";
  const emptyBody = hasTraining
    ? profileIsPrimary
      ? "Every session you have is complete. Next, take your Profile."
      : assessmentIsPrimary
        ? "Every session you have is complete. Your manager also sent an assessment."
        : "Every session you have is complete."
    : profileIsPrimary
      ? "Your manager hasn’t assigned a training yet. You can take your Profile while you wait."
      : assessmentIsPrimary
        ? "Your manager hasn’t assigned a training yet. They did send an assessment."
        : "Your manager hasn’t assigned a training yet. It will show up here when they do.";

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        {next ? (
          <FirstVisitIntro
            eligible={showFirstVisitIntro}
            href={continueHref(next.session.id, next.progress)}
            trainingTitle={next.training.title}
            trainingDescription={next.training.description}
            sessionNumber={next.session.session_number}
            total={nextTotal}
            completed={nextCompleted}
            percent={nextPercent}
            coverSrc={sessionCover(next.session.session_number)}
          >
            <div className="min-w-0 space-y-2">
              <p className={eyebrowClassName}>{heroLabel}</p>
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="h-24 overflow-hidden bg-[#101510] sm:h-36 lg:h-44">
                  <CoverPhoto src={sessionCover(next.session.session_number)} />
                </div>
                <div className="space-y-5 p-4 sm:p-5 lg:p-6">
                  <div>
                    <p className={eyebrowClassName}>
                      {neverStarted
                        ? nextTotal > 0
                          ? `Session ${next.session.session_number} of ${nextTotal}`
                          : `Session ${next.session.session_number}`
                        : nextTotal > 0
                          ? `Session ${next.session.session_number} of ${nextTotal} · ${next.training.title}`
                          : `Session ${next.session.session_number} · ${next.training.title}`}
                    </p>
                    <h1 className="font-heading mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                      {neverStarted ? next.training.title : next.session.title}
                    </h1>
                    {neverStarted ? (
                      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        Start with the Overview. Each session follows the same rhythm:
                        Film → Check-in → Action.
                      </p>
                    ) : next.session.keyline ? (
                      <p className="mt-1 text-sm text-muted-foreground">{next.session.keyline}</p>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    {nextTotal > 0 ? (
                      <div className="space-y-2">
                        <ProgressBar value={nextPercent} />
                        <p className="text-sm text-muted-foreground">
                          {nextCompleted} of {nextTotal} sessions complete
                        </p>
                      </div>
                    ) : null}
                    <Link
                      href={continueHref(next.session.id, next.progress)}
                      className={cn(
                        buttonVariants({ variant: "inverse", size: "lg" }),
                        "w-full sm:w-auto"
                      )}
                    >
                      {neverStarted ? "Start the Overview" : continueLabel}
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </FirstVisitIntro>
        ) : (
          <section className="flex flex-col justify-center rounded-xl border border-border bg-card p-4 sm:p-6 lg:p-8">
            <p className={eyebrowClassName}>
              {emptyEyebrow}
            </p>
            <h1 className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {emptyTitle}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{emptyBody}</p>
            {profileIsPrimary ? (
              <div className="mt-6">
                {draft ? (
                  <Link
                    href={profileContinueHref}
                    className={cn(
                      buttonVariants({ variant: "inverse", size: "lg" }),
                      "w-full sm:w-auto"
                    )}
                  >
                    Continue Profile
                  </Link>
                ) : (
                  <form action={startProfile}>
                    <Button type="submit" variant="inverse" size="lg" className="w-full sm:w-auto">
                      Take your Profile
                    </Button>
                  </form>
                )}
              </div>
            ) : null}
            {assessmentIsPrimary && pendingAssessment ? (
              <div className="mt-6">
                <Link
                  href={takeHref(pendingAssessment.assignment.id)}
                  className={cn(
                    buttonVariants({ variant: "inverse", size: "lg" }),
                    "w-full sm:w-auto"
                  )}
                >
                  {pendingAssessment.assignment.status === "in_progress"
                    ? "Continue assessment"
                    : "Take assessment"}
                </Link>
              </div>
            ) : null}
            {!profileIsPrimary && !assessmentIsPrimary && profile ? (
              <div className="mt-6">
                <Link
                  href="/father/profile"
                  className={cn(
                    buttonVariants({ variant: "inverse", size: "lg" }),
                    "w-full sm:w-auto"
                  )}
                >
                  View your Profile
                </Link>
              </div>
            ) : null}
          </section>
        )}

        <section className="flex flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className={eyebrowClassName}>
            Profile
          </p>
          {profile ? (
            <>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Primary Edge</dt>
                  <dd className="min-w-0 text-right font-medium uppercase">
                    {profile.primary_edge ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Determination</dt>
                  <dd className="min-w-0 text-right font-medium uppercase">
                    {profile.primary_determination ?? "—"}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">
                Taken{" "}
                {new Date(profile.taken_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="mt-auto pt-5">
                <Link
                  href="/father/profile/results"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  View your Profile
                </Link>
              </div>
            </>
          ) : draft ? (
            <>
              <p className="mt-3 font-heading text-base font-semibold">In progress</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Question {firstUnanswered(draft.answers)} of {PROFILE_QUESTION_COUNT}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{profileReminder}</p>
              {profileIsPrimary ? null : (
                <div className="mt-auto pt-5">
                  <Link
                    href={profileContinueHref}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    Continue Profile
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Optional. About twenty minutes, one question at a time.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{profileReminder}</p>
              {profileIsPrimary ? null : (
                <form action={startProfile} className="mt-auto pt-5">
                  <Button type="submit" variant="outline" className="w-full">
                    Take your Profile
                  </Button>
                </form>
              )}
            </>
          )}
        </section>
      </div>

      {trainingCards.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <p className={eyebrowClassName}>
              Your trainings
            </p>
            {issuedCertificates.length > 0 ? (
              <Link
                href="/father/certificates"
                className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
              >
                View certificates
              </Link>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {trainingCards.map(({ training, completed, total, next: trainingNext, nextProgress }) => {
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
              const complete = total > 0 && completed === total;
              return (
                <Link
                  key={training.id}
                  href={
                    trainingNext
                      ? continueHref(trainingNext.id, nextProgress)
                      : "/father/trainings"
                  }
                  className={cn(
                    "rounded-xl border border-border bg-card p-4 sm:p-5",
                    interactiveSurfaceClassName
                  )}
                >
                  <p className="font-heading text-sm font-semibold sm:text-base">
                    {training.title}
                  </p>
                  <div className="mt-4 space-y-2">
                    <ProgressBar value={percent} />
                    <p className="text-sm text-muted-foreground">
                      {total === 0
                        ? "Sessions will appear when this training is ready."
                        : complete
                          ? "Complete"
                          : `${completed} of ${total} sessions`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <AssignedAssessmentList
        assignments={customAssignments}
        title="Assessments"
        quiet
      />
    </div>
  );
}
