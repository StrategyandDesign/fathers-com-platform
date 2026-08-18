import { notFound, redirect } from "next/navigation";

import { PlatformResults, PlatformTakeForm, platformBandCopy } from "@/components/assessments/platform-take";
import { localizedText, pickInterpretationBand } from "@/lib/admin/platform-assessments";
import { loadPlatformTakeContext } from "@/lib/assessments/platform-take";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherPlatformAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentKey: string }>;
  searchParams: Promise<{ q?: string; error?: string; notice?: string }>;
}) {
  const { assessmentKey } = await params;
  const query = await searchParams;
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const ctx = await loadPlatformTakeContext({
    userId: user.id,
    role: "father",
    assessmentKey,
  });
  if (!ctx) notFound();
  if (!ctx.allowed) {
    redirect("/father/assessments?error=flash.keystoneUnavailable");
  }

  const title = localizedText(ctx.assessment.title, ctx.assessment.title_he, locale);
  if (ctx.attempt?.status === "completed") {
    const liveBand = pickInterpretationBand(
      ctx.attempt.overall_score ?? 0,
      ctx.assessment.instrument.bands.map((band) => ({
        minScore: band.minScore,
        maxScore: band.maxScore,
        label: band.label,
        labelHe: band.labelHe,
        description: band.description,
        descriptionHe: band.descriptionHe,
      }))
    );
    const band = platformBandCopy(
      locale,
      liveBand ?? {
        label: ctx.attempt.band_label ?? "",
        description: ctx.attempt.band_description,
      }
    );
    const domainScores = Array.isArray(ctx.attempt.domain_scores)
      ? (ctx.attempt.domain_scores as Array<{ title?: string; score?: number }>)
      : [];
    return (
      <PlatformResults
        title={title}
        overall={ctx.attempt.overall_score ?? 0}
        bandLabel={band.label}
        bandDescription={band.description}
        domains={domainScores.map((row) => ({
          title: String(row.title ?? ""),
          score: Number(row.score ?? 0),
        }))}
        listHref="/father/assessments"
        error={query.error}
        notice={query.notice}
        t={t}
      />
    );
  }

  if (ctx.items.length === 0) {
    redirect("/father/assessments?error=flash.assessmentNoQuestions");
  }

  const firstOpen = ctx.items.findIndex((item) => ctx.answers.get(item.id) == null);
  const requested = Number(query.q ?? (firstOpen >= 0 ? firstOpen + 1 : 1));
  const questionNumber = Number.isInteger(requested)
    ? Math.min(ctx.items.length, Math.max(1, requested))
    : 1;
  const item = ctx.items[questionNumber - 1]!;

  return (
    <PlatformTakeForm
      assessmentKey={ctx.assessment.assessment_key}
      itemId={item.id}
      title={title}
      domainTitle={localizedText(item.domainTitle, item.domainTitleHe, locale)}
      prompt={localizedText(item.prompt, item.promptHe, locale)}
      questionNumber={questionNumber}
      total={ctx.items.length}
      saved={ctx.answers.get(item.id)}
      listHref="/father/assessments"
      error={query.error}
      notice={query.notice}
      t={t}
    />
  );
}
