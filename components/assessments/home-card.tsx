import Link from "next/link";

import { AssessmentPhotoPlate } from "@/components/assessments/photo-plate";
import { buttonVariants } from "@/components/ui/button";
import { takeHref, type FatherAssignmentCard } from "@/lib/assessments/types";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-white/65 uppercase sm:text-xs sm:tracking-[0.18em]";

export async function AssessmentHomeCard({
  card,
  coverSrc,
  fatherName,
  className,
}: {
  card?: FatherAssignmentCard | null;
  coverSrc: string;
  fatherName?: string | null;
  className?: string;
}) {
  const { t, locale } = await getI18n();
  const assignment = card?.assignment ?? null;
  const assessment = card?.assessment ?? null;
  const questionCount = card?.questionCount ?? 0;
  const answeredCount = card?.answeredCount ?? 0;
  const completed = assignment?.status === "completed";
  const href = assignment ? takeHref(assignment.id) : "/father/assessments";
  const actionClassName = cn(buttonVariants({ variant: "outline" }), "w-full min-h-11");
  const displayName = fatherName?.trim() || null;

  return (
    <section className={className} aria-label={t("father.home.assessment")}>
      <AssessmentPhotoPlate
        src={coverSrc}
        completed={completed}
        className="flex min-h-56 flex-col sm:min-h-64"
      >
        <div className="flex min-h-56 flex-1 flex-col p-4 sm:min-h-64 sm:p-5">
          <p className={eyebrowClassName}>{t("father.home.assessment")}</p>
          {!assignment || !assessment ? (
            <>
              <h2 className="font-display mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                {t("father.assessments.emptyTitle")}
              </h2>
              <p className="mt-2 text-sm text-white/65">{t("father.home.assessmentWaiting")}</p>
            </>
          ) : completed ? (
            <>
              <h2 className="font-display mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                {assessment.title}
              </h2>
              {displayName ? (
                <p className="font-display mt-2 text-sm italic text-white/75">{displayName}</p>
              ) : null}
              <p className="mt-3 text-sm text-white/65">
                {t("father.home.taken", {
                  date: formatLongDate(assignment.completed_at ?? assignment.created_at, locale),
                })}
              </p>
              {questionCount > 0 ? (
                <p className="mt-1 text-sm text-white/55">
                  {t("father.assessments.recordCount", { n: questionCount })}
                </p>
              ) : null}
              <div className="mt-auto pt-5">
                <Link href={href} className={actionClassName}>
                  {t("father.assessments.view")}
                </Link>
              </div>
            </>
          ) : questionCount === 0 ? (
            <>
              <h2 className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                {assessment.title}
              </h2>
              <p className="mt-2 text-sm text-white/65">{t("father.assessments.notReadyBody")}</p>
              <div className="mt-auto pt-5">
                <Link href="/father" className={actionClassName}>
                  {t("father.assessments.backHome")}
                </Link>
              </div>
            </>
          ) : assignment.status === "in_progress" ? (
            <>
              <h2 className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                {t("father.home.inProgress")}
              </h2>
              <p className="mt-1 text-sm text-white/80">{assessment.title}</p>
              <p className="mt-2 text-sm text-white/65">
                {t("father.home.questionOf", {
                  n: Math.min(questionCount, answeredCount + 1),
                  total: questionCount,
                })}
              </p>
              <div className="mt-auto pt-5">
                <Link href={href} className={actionClassName}>
                  {t("father.home.continueAssessment")}
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                {assessment.title}
              </h2>
              <p className="mt-2 text-sm text-white/65">{t("father.assessments.quietLead")}</p>
              <div className="mt-auto pt-5">
                <Link href={href} className={actionClassName}>
                  {t("father.home.takeAssessment")}
                </Link>
              </div>
            </>
          )}
        </div>
      </AssessmentPhotoPlate>
    </section>
  );
}
