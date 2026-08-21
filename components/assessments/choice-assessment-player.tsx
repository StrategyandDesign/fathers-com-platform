"use client";

import { useMemo, useState, useTransition } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import {
  completeFirstPartyAssessment,
  retakeFirstPartyAssessment,
  saveFirstPartyProgress,
} from "@/lib/assessments/first-party-actions";
import type { FirstPartyAssessmentCopy } from "@/lib/assessments/first-party";
import type { InstrumentChoice } from "@/lib/assessments/instrument";
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
}: {
  assessmentKey: string;
  title: string;
  copy: FirstPartyAssessmentCopy;
  items: PlayerItem[];
  initialAnswers: Record<string, number>;
  completed: CompletedResult | null;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [screen, setScreen] = useState<"intro" | "questions" | "results">(
    completed ? "results" : Object.keys(initialAnswers).length > 0 ? "questions" : "intro"
  );
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [index, setIndex] = useState(() => {
    const firstOpen = items.findIndex((item) => initialAnswers[item.id] == null);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [copied, setCopied] = useState(false);
  const [stepKey, setStepKey] = useState(0);

  const item = items[index];
  const answeredCount = items.filter((entry) => answers[entry.id] != null).length;
  const percent = Math.round(((index + 1) / items.length) * 100);

  const result = useMemo(() => {
    if (completed && screen === "results") return completed;
    return null;
  }, [completed, screen]);

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
    const formData = new FormData();
    formData.set("assessment_key", assessmentKey);
    for (const entry of items) {
      const answer = nextAnswers[entry.id];
      if (answer != null) formData.set(`answer_${entry.id}`, String(answer));
    }
    startTransition(() => completeFirstPartyAssessment(formData));
  }

  function saveAndExit() {
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
    const formData = new FormData();
    formData.set("assessment_key", assessmentKey);
    startTransition(() => retakeFirstPartyAssessment(formData));
  }

  async function copySummary() {
    if (!result) return;
    const text = [
      title,
      `${result.outcomeLabel}`,
      `Score ${result.total} of ${result.maxTotal}`,
      result.outcomeDescription ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
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
            {t("father.assessments.yourDesignation")}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {result.outcomeLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("father.assessments.scoreOf", { score: result.total, max: result.maxTotal })}
          </p>
        </div>
        <section className="space-y-6 rounded-xl border border-primary/30 bg-card p-5 sm:p-7">
          <p className="text-base leading-7 text-foreground sm:text-lg">
            {result.outcomeDescription}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{title}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={copySummary} variant="outline" className="w-full sm:w-auto">
              {copied ? t("father.assessments.copied") : t("father.assessments.copyResults")}
            </Button>
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
          <button
            type="button"
            onClick={saveAndExit}
            className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
          >
            {t("father.assessments.saveExit")}
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {pending ? t("common.saving") : t("father.assessments.canStop")}
        </p>
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
