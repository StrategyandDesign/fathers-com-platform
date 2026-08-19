import Link from "next/link";

import { AssessmentPhotoPlate } from "@/components/assessments/photo-plate";
import { buttonVariants } from "@/components/ui/button";
import type {
  CustomAssessment,
  CustomAssessmentAssignment,
  CustomAssessmentQuestion,
} from "@/lib/assessments/types";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export async function AssessmentResultsAward({
  assessment,
  assignment,
  questions,
  answers,
  coverSrc,
  fatherName,
  homeHref = "/father",
  listHref = "/father/assessments",
}: {
  assessment: CustomAssessment;
  assignment: CustomAssessmentAssignment;
  questions: CustomAssessmentQuestion[];
  answers: Map<string, string>;
  coverSrc: string;
  fatherName?: string | null;
  homeHref?: string;
  listHref?: string;
}) {
  const { t, locale } = await getI18n();
  const completedOn = formatLongDate(
    assignment.completed_at ?? assignment.created_at,
    locale
  );
  const name = fatherName?.trim() || null;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <AssessmentPhotoPlate src={coverSrc} completed className="min-h-[22rem] sm:min-h-[26rem]">
        <div className="flex min-h-[22rem] flex-col justify-end p-6 sm:min-h-[26rem] sm:p-10">
          <p className="text-[11px] font-medium tracking-[0.28em] text-white/60 uppercase sm:text-xs">
            {t("father.assessments.awardEyebrow")}
          </p>
          <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
            {assessment.title}
          </h1>
          {name ? (
            <p className="font-display mt-4 text-lg italic text-white/80 sm:text-xl">{name}</p>
          ) : null}
          <div className="mt-6 h-px w-16 bg-primary" />
          <p className="mt-5 text-sm tracking-wide text-white/70">
            {t("father.assessments.completedOn", { date: completedOn })}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
            {t("father.assessments.awardLead")}
          </p>
        </div>
      </AssessmentPhotoPlate>

      <section>
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {t("father.assessments.awardRecord")}
        </p>
        <ol className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {questions.map((item, index) => {
            const answer = answers.get(item.id)?.trim() || "—";
            return (
              <li key={item.id} className="px-5 py-6 sm:px-8 sm:py-8">
                <p className="text-[11px] font-medium tracking-[0.2em] text-primary/80 uppercase">
                  {t("common.questionN", { n: index + 1 })}
                </p>
                <h2 className="font-heading mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                  {item.prompt}
                </h2>
                <p className="mt-4 border-s-2 border-primary/50 ps-4 text-base leading-relaxed text-white/85 whitespace-pre-wrap">
                  {answer}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={homeHref}
          className={cn(buttonVariants({ size: "lg" }), "w-full min-h-12 sm:w-auto")}
        >
          {t("father.assessments.backHome")}
        </Link>
        <Link
          href={listHref}
          className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
        >
          {t("father.assessments.backToAssessments")}
        </Link>
      </div>
    </div>
  );
}