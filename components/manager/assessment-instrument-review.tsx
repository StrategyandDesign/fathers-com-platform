import { getI18n } from "@/lib/i18n/server";
import type { InstrumentReviewModel } from "@/lib/assessments/instrument-review";

export async function AssessmentInstrumentReview({
  model,
}: {
  model: InstrumentReviewModel;
}) {
  const { t } = await getI18n();

  return (
    <section id="instrument" className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">
          {t("manager.assessments.instrumentTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.assessments.instrumentLead")}
        </p>
        {model.copy ? (
          <div className="mt-5 space-y-4 text-sm leading-6 text-foreground">
            <ReviewBlock label={t("father.assessments.introduction")} body={model.copy.introduction} />
            <ReviewBlock label={t("father.assessments.purpose")} body={model.copy.purpose} />
            <ReviewBlock label={t("father.assessments.goal")} body={model.copy.goal} />
            <p className="text-muted-foreground">{model.copy.honestHint}</p>
          </div>
        ) : null}
        {model.sharedScale && model.sharedScale.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm text-muted-foreground">{t("manager.assessments.instrumentScale")}</p>
            <ol className="mt-3 space-y-2">
              {model.sharedScale.map((choice) => (
                <li key={choice.key} className="flex gap-3 text-sm leading-6">
                  <span className="w-6 shrink-0 font-medium">{choice.key}.</span>
                  <span>{choice.label}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      {model.questions.map((question, index) => (
        <article
          key={question.id}
          className="rounded-xl border border-border bg-card p-4 sm:p-6"
        >
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {t("manager.assessments.questionN", { n: index + 1 })}
          </p>
          <h3 className="mt-2 font-heading text-base font-semibold leading-snug sm:text-lg">
            {question.prompt}
          </h3>
          {question.choices.length > 0 ? (
            <ol className="mt-4 space-y-2">
              {question.choices.map((choice) => (
                <li key={choice.key} className="flex gap-3 text-sm leading-6">
                  <span className="w-6 shrink-0 font-medium">{choice.key}.</span>
                  <span>{choice.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </article>
      ))}

      {model.bands.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h3 className="font-heading text-lg font-semibold">
            {t("manager.assessments.instrumentDesignations")}
          </h3>
          <ul className="mt-4 space-y-4">
            {model.bands.map((band) => (
              <li key={`${band.range}-${band.label}`}>
                <p className="font-medium">
                  {band.range}: {band.label}
                </p>
                {band.description ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{band.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function ReviewBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p>{body}</p>
    </div>
  );
}
