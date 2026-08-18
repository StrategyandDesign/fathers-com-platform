import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { ProfileAnswerOptions } from "@/components/profile/answer-options";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { localizedText } from "@/lib/admin/platform-assessments";
import {
  saveAndExitPlatformAssessment,
  savePlatformAnswer,
} from "@/lib/assessments/platform-actions";
import { PROFILE_SCALE } from "@/lib/father/questions";
import { translateProfileScale } from "@/lib/i18n/flash";
import type { Translate } from "@/lib/i18n/translate";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function PlatformTakeForm({
  assessmentKey,
  itemId,
  title,
  domainTitle,
  prompt,
  questionNumber,
  total,
  saved,
  listHref,
  error,
  notice,
  t,
}: {
  assessmentKey: string;
  itemId: string;
  title: string;
  domainTitle: string;
  prompt: string;
  questionNumber: number;
  total: number;
  saved?: number;
  listHref: string;
  error?: string;
  notice?: string;
  t: Translate;
}) {
  const isLast = questionNumber === total;
  const percent = Math.round((questionNumber / total) * 100);
  const scale = PROFILE_SCALE.map((option) => ({
    value: option.value,
    label: translateProfileScale(option.value, t),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href={listHref} className={interactiveLinkClassName}>
          {t("father.assessments.title")}
        </Link>
        <span className="px-2 text-white/20">|</span>
        <span>{title}</span>
      </p>
      <Flash error={error} notice={notice} />
      <form action={savePlatformAnswer} className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="assessment_key" value={assessmentKey} />
        <input type="hidden" name="item_id" value={itemId} />
        <input type="hidden" name="question_number" value={questionNumber} />
        <input type="hidden" name="finish" value={isLast ? "true" : "false"} />
        <p className="text-sm text-muted-foreground">
          {t("father.assessments.answered", {
            answered: questionNumber,
            total,
          })}
          {` · ${domainTitle}`}
        </p>
        <div className="mt-3">
          <ProgressBar value={percent} />
        </div>
        <h1 className="mt-6 font-heading text-xl font-semibold">{prompt}</h1>
        <ProfileAnswerOptions options={scale} saved={saved} autoAdvance={!isLast} />
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" data-assessment-advance className="w-full sm:w-auto">
            {isLast ? t("father.assessments.submit") : t("common.continue")}
          </Button>
          <Button
            type="submit"
            formAction={saveAndExitPlatformAssessment}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {t("father.assessments.saveExit")}
          </Button>
        </div>
      </form>
      <p className="text-sm text-muted-foreground">{t("father.assessments.canStop")}</p>
    </div>
  );
}

export function PlatformResults({
  title,
  overall,
  bandLabel,
  bandDescription,
  domains,
  listHref,
  error,
  notice,
  t,
}: {
  title: string;
  overall: number;
  bandLabel: string | null;
  bandDescription: string | null;
  domains: Array<{ title: string; score: number }>;
  listHref: string;
  error?: string;
  notice?: string;
  t: Translate;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href={listHref} className={interactiveLinkClassName}>
          {t("father.assessments.title")}
        </Link>
        <span className="px-2 text-white/20">|</span>
        <span>{title}</span>
      </p>
      <Flash error={error} notice={notice} />
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {t("father.assessments.awardEyebrow")}
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-4xl font-semibold tabular-nums">{overall}</p>
        {bandLabel ? <p className="mt-2 font-medium">{bandLabel}</p> : null}
        {bandDescription ? (
          <p className="mt-2 text-sm text-muted-foreground">{bandDescription}</p>
        ) : null}
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {domains.map((domain) => (
            <li
              key={domain.title}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span>{domain.title}</span>
              <span className="tabular-nums">{domain.score}</span>
            </li>
          ))}
        </ul>
      </section>
      <Link href={listHref} className={cn(buttonVariants({ variant: "outline" }))}>
        {t("father.assessments.backToAssessments")}
      </Link>
    </div>
  );
}

export function platformBandCopy(
  locale: string,
  band: {
    label: string;
    labelHe?: string | null;
    description?: string | null;
    descriptionHe?: string | null;
  } | null
) {
  if (!band) return { label: null as string | null, description: null as string | null };
  return {
    label: localizedText(band.label, band.labelHe, locale),
    description: band.description
      ? localizedText(band.description, band.descriptionHe, locale)
      : null,
  };
}
