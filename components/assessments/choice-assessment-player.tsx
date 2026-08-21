"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { useT } from "@/components/i18n/locale-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import {
  completeFirstPartyAssessment,
  retakeFirstPartyAssessment,
  saveFirstPartyProgress,
} from "@/lib/assessments/first-party-actions";
import type { FirstPartyAssessmentCopy } from "@/lib/assessments/first-party";
import {
  evaluateInstrument,
  listInstrumentDesignations,
  type AssessmentInstrument,
  type InstrumentChoice,
} from "@/lib/assessments/instrument";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type PlayerItem = {
  id: string;
  prompt: string;
  choices: InstrumentChoice[];
};

type CompletedResult = {
  total: number;
  maxTotal: number;
  outcomeLabel: string;
  outcomeDescription: string | null;
};

export function ChoiceAssessmentPlayer({
  assessmentKey,
  title,
  copy,
  items,
  initialAnswers,
  completed,
  preview = false,
  instrument,
  designations = [],
  listHref = "/father/assessments",
  completedLabel = null,
}: {
  assessmentKey: string;
  title: string;
  copy: FirstPartyAssessmentCopy;
  items: PlayerItem[];
  initialAnswers: Record<string, number>;
  completed: CompletedResult | null;
  preview?: boolean;
  instrument?: AssessmentInstrument;
  designations?: string[];
  listHref?: string;
  completedLabel?: string | null;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [localResult, setLocalResult] = useState<CompletedResult | null>(null);
  const [screen, setScreen] = useState<"intro" | "questions" | "results">(
    completed ? "results" : Object.keys(initialAnswers).length > 0 ? "questions" : "intro"
  );
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [index, setIndex] = useState(() => {
    const firstOpen = items.findIndex((item) => initialAnswers[item.id] == null);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [stepKey, setStepKey] = useState(0);
  const designationScale =
    designations.length > 0
      ? designations
      : instrument
        ? listInstrumentDesignations(instrument)
        : [];

  const item = items[index];
  const answeredCount = items.filter((entry) => answers[entry.id] != null).length;
  const percent = Math.round(((index + 1) / items.length) * 100);

  const result = useMemo(() => {
    if (screen !== "results") return null;
    return localResult ?? completed;
  }, [completed, localResult, screen]);

  function goTo(next: number) {
    setIndex(Math.min(items.length - 1, Math.max(0, next)));
    setStepKey((value) => value + 1);
  }

  function choose(value: number) {
    if (!item || pending) return;
    const nextAnswers = { ...answers, [item.id]: value };
    setAnswers(nextAnswers);
    if (index < items.length - 1) {
      window.setTimeout(() => goTo(index + 1), 160);
      return;
    }
    if (preview && instrument) {
      try {
        const scored = evaluateInstrument(instrument, nextAnswers);
        setLocalResult({
          total: scored.total,
          maxTotal: items.length * instrument.scoring.scale.max,
          outcomeLabel: scored.outcomeLabel,
          outcomeDescription: scored.outcomeDescription,
        });
        setScreen("results");
      } catch {
        return;
      }
      return;
    }
    const formData = new FormData();
    formData.set("assessment_key", assessmentKey);
    for (const entry of items) {
      const answer = nextAnswers[entry.id];
      if (answer != null) formData.set(`answer_${entry.id}`, String(answer));
    }
    startTransition(() => completeFirstPartyAssessment(formData));
  }

  function saveAndExit() {
    if (preview) return;
    const formData = new FormData();
    formData.set("assessment_key", assessmentKey);
    formData.set("intent", "exit");
    formData.set("question_index", String(index + 1));
    for (const entry of items) {
      const answer = answers[entry.id];
      if (answer != null) formData.set(`answer_${entry.id}`, String(answer));
    }
    startTransition(() => saveFirstPartyProgress(formData));
  }

  function retake() {
    if (preview) {
      setAnswers({});
      setLocalResult(null);
      setIndex(0);
      setScreen("intro");
      setStepKey((value) => value + 1);
      return;
    }
    const formData = new FormData();
    formData.set("assessment_key", assessmentKey);
    startTransition(() => retakeFirstPartyAssessment(formData));
  }

  if (screen === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t("father.assessments.awardEyebrow")}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
        </div>
        <section className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-7">
          <IntroBlock label={t("father.assessments.introduction")} body={copy.introduction} />
          <IntroBlock label={t("father.assessments.purpose")} body={copy.purpose} />
          <IntroBlock label={t("father.assessments.goal")} body={copy.goal} />
          <p className="text-sm leading-6 text-muted-foreground">{copy.honestHint}</p>
          <Button
            type="button"
            size="lg"
            className="w-full min-h-12 sm:w-auto"
            onClick={() => {
              setScreen("questions");
              setStepKey((value) => value + 1);
            }}
          >
            {t("father.assessments.begin")}
          </Button>
        </section>
      </div>
    );
  }

  if (screen === "results" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t("father.assessments.youEarned")}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {result.outcomeLabel}
          </h1>
          <p className="text-base text-foreground">
            {t("father.assessments.designationOn", { title })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("father.assessments.scoreOf", { score: result.total, max: result.maxTotal })}
          </p>
          {completedLabel ? (
            <p className="text-sm text-muted-foreground">
              {t("father.assessments.completedOn", { date: completedLabel })}
            </p>
          ) : null}
        </div>
        <section className="space-y-6 rounded-xl border border-primary/30 bg-card p-5 sm:p-7">
          {designationScale.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {t("father.assessments.designationScale")}
              </p>
              <ol className="mt-3 space-y-2">
                {designationScale.map((label) => {
                  const earned = label === result.outcomeLabel;
                  return (
                    <li
                      key={label}
                      className={cn(
                        "flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-3 py-2",
                        earned
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <span className={cn("font-medium", earned && "text-foreground")}>{label}</span>
                      {earned ? (
                        <span className="text-xs font-medium tracking-[0.08em] text-primary uppercase">
                          {t("father.assessments.youEarnedThis")}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
          {result.outcomeDescription ? (
            <div>
              <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {t("father.assessments.designationMeans")}
              </p>
              <p className="mt-2 text-base leading-7 text-foreground sm:text-lg">
                {result.outcomeDescription}
              </p>
            </div>
          ) : null}
          <p className="text-sm leading-6 text-muted-foreground">{title}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={listHref}
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              {t("father.assessments.returnToAssessments")}
            </Link>
            <Button
              type="button"
              onClick={retake}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {t("father.assessments.retake")}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-sm text-foreground">
          {t("father.home.questionOf", { n: index + 1, total: items.length })}
        </p>
        <ProgressBar value={percent} />
        <p className="text-xs text-muted-foreground">
          {t("father.assessments.answered", { answered: answeredCount, total: items.length })}
        </p>
      </div>

      <div
        key={`${item.id}-${stepKey}`}
        className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border bg-card p-4 duration-200 sm:p-6"
      >
        <h1 className="font-heading text-lg font-semibold leading-snug sm:text-xl lg:text-2xl">
          {item.prompt}
        </h1>
        <fieldset className="mt-8 space-y-2" disabled={pending}>
          <legend className="sr-only">{t("father.assessments.answer")}</legend>
          {item.choices.map((choice) => {
            const selected = answers[item.id] === choice.value;
            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => choose(choice.value)}
                className={cn(
                  "flex w-full min-h-14 items-start gap-3 rounded-lg border px-4 py-3 text-left transition-[border-color,background-color,transform] duration-150 ease-out",
                  selected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border hover:bg-white/5",
                  pending && "pointer-events-none opacity-70"
                )}
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-black/30 text-sm font-semibold">
                  {choice.key}
                </span>
                <span className="text-base leading-6">{choice.label}</span>
              </button>
            );
          })}
        </fieldset>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {index > 0 ? (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
            >
              {t("common.back")}
            </button>
          ) : null}
          {preview ? null : (
            <button
              type="button"
              onClick={saveAndExit}
              className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
            >
              {t("father.assessments.saveExit")}
            </button>
          )}
        </div>
        {preview ? null : (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {pending ? t("common.saving") : t("father.assessments.canStop")}
          </p>
        )}
      </div>
    </div>
  );
}

function IntroBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </h2>
      <p className="text-base leading-7 text-foreground">{body}</p>
    </div>
  );
}
