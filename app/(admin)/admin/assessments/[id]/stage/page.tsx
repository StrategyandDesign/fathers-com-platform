import Link from "next/link";
import { notFound } from "next/navigation";

import { markPlatformAssessmentPreviewed } from "@/lib/admin/platform-assessment-actions";
import { loadAdminPlatformAssessment } from "@/lib/admin/platform-assessment-data";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import { asDevelopmentStatus, formatEditedAt } from "@/lib/admin/development";
import { localizedText } from "@/lib/admin/platform-assessments";
import { requireRole } from "@/lib/auth/session";
import { translateProfileScale } from "@/lib/i18n/flash";
import { getI18n } from "@/lib/i18n/server";
import { PROFILE_SCALE } from "@/lib/father/questions";
import { interactiveLinkClassName, radioOptionClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminAssessmentStagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  await requireRole("admin");
  const { t } = await getI18n();
  const assessment = await loadAdminPlatformAssessment(id);
  if (!assessment) notFound();

  const items = assessment.instrument.domains.flatMap((domain) =>
    domain.items.map((item) => ({
      domainTitle: domain.title,
      prompt: item.prompt,
    }))
  );

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-sm text-muted-foreground">
          <Link href={`/admin/assessments/${assessment.id}`} className={interactiveLinkClassName}>
            {assessment.title}
          </Link>
          <span className="px-2 text-white/20">|</span>
          <span>Stage</span>
        </p>
        <EmptyState
          title="Nothing to stage yet"
          actionHref={`/admin/assessments/${assessment.id}`}
          actionLabel="Back to builder"
        >
          Add weighted domains and questions, then walk the Father path here.
        </EmptyState>
      </div>
    );
  }

  const requested = Number(query.q ?? 1);
  const questionNumber = Number.isInteger(requested)
    ? Math.min(items.length, Math.max(1, requested))
    : 1;
  const question = items[questionNumber - 1]!;
  const isLast = questionNumber === items.length;
  const percent = Math.round((questionNumber / items.length) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/assessments" className={interactiveLinkClassName}>
            Assessments
          </Link>
          <span className="px-2 text-white/20">|</span>
          <Link href={`/admin/assessments/${assessment.id}`} className={interactiveLinkClassName}>
            {assessment.title}
          </Link>
          <span className="px-2 text-white/20">|</span>
          <span>Stage</span>
        </p>
        <DevelopmentStatusBadge status={asDevelopmentStatus(assessment.development_status)} />
      </div>
      <Flash error={query.error} notice={query.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Sandbox walk
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          {assessment.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Same Likert path a father gets after a Leader shares this. Answers
          are not saved.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Stage walk {assessment.previewed_at ? formatEditedAt(assessment.previewed_at) : "not yet"}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          {t("father.assessments.answered", {
            answered: questionNumber,
            total: items.length,
          })}
          {` · ${question.domainTitle}`}
        </p>
        <div className="mt-3">
          <ProgressBar value={percent} />
        </div>
        <h2 className="mt-6 font-heading text-xl font-semibold">{question.prompt}</h2>
        <fieldset className="mt-8 space-y-1">
          <legend className="sr-only">{t("father.assessments.answer")}</legend>
          {PROFILE_SCALE.map((option) => (
            <label key={option.value} className={radioOptionClassName}>
              <input type="radio" name="preview" value={option.value} className="size-4 accent-primary" />
              <span>{translateProfileScale(option.value, t)}</span>
            </label>
          ))}
        </fieldset>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {questionNumber > 1 ? (
            <Link
              href={`/admin/assessments/${assessment.id}/stage?q=${questionNumber - 1}`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              Previous
            </Link>
          ) : null}
          {isLast ? (
            <form action={markPlatformAssessmentPreviewed} className="w-full sm:w-auto">
              <input type="hidden" name="assessment_id" value={assessment.id} />
              <Button type="submit" className="w-full sm:w-auto">
                Mark Stage walk complete
              </Button>
            </form>
          ) : (
            <Link
              href={`/admin/assessments/${assessment.id}/stage?q=${questionNumber + 1}`}
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              Next
            </Link>
          )}
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        {localizedText(
          assessment.description ?? "Fathers see the matching interpretation band when they finish.",
          assessment.description_he,
          "en"
        )}
      </p>
    </div>
  );
}
