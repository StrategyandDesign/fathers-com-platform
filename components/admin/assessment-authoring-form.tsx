import { saveFirstPartyAssessment } from "@/lib/admin/assessment-edit-actions";
import {
  FIRST_PARTY_BAND_LABEL_MAX,
  FIRST_PARTY_COPY_MAX,
  FIRST_PARTY_DESCRIPTION_MAX,
  FIRST_PARTY_HINT_MAX,
  FIRST_PARTY_TITLE_MAX,
  draftFromFirstParty,
  firstPartyScoreRange,
} from "@/lib/assessments/first-party-catalog";
import type { FirstPartyAssessment } from "@/lib/assessments/first-party";
import { INSTRUMENT_BAND_DESCRIPTION_MAX, INSTRUMENT_CHOICE_LABEL_MAX, INSTRUMENT_PROMPT_MAX } from "@/lib/assessments/instrument";
import { Button } from "@/components/ui/button";
import { fieldClassName, textareaClassName } from "@/lib/ui";

export function AssessmentAuthoringForm({
  assessment,
  invalid,
  released,
}: {
  assessment: FirstPartyAssessment;
  invalid?: boolean;
  released: boolean;
}) {
  const draft = draftFromFirstParty(assessment);
  const range = firstPartyScoreRange(draft.items.length);

  return (
    <form action={saveFirstPartyAssessment} className="space-y-6">
      <input type="hidden" name="assessment_key" value={assessment.key} />
      <input type="hidden" name="question_count" value={draft.items.length} />
      <input type="hidden" name="band_count" value={draft.bands.length} />

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Catalog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {released
              ? "This is already released. Saving changes the instrument fathers take next."
              : "Leaders and fathers see this after you release it."}{" "}
            The key stays locked.
          </p>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input
            className={fieldClassName}
            name="title"
            defaultValue={draft.title}
            maxLength={FIRST_PARTY_TITLE_MAX}
            required
            aria-invalid={invalid || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea
            className={textareaClassName}
            name="description"
            defaultValue={draft.description}
            maxLength={FIRST_PARTY_DESCRIPTION_MAX}
            aria-invalid={invalid || undefined}
          />
          <span className="block text-sm text-muted-foreground">
            Short catalog blurb. Leaders see this on the assessment card.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Introduction</span>
          <textarea
            className={textareaClassName}
            name="introduction"
            defaultValue={draft.copy.introduction}
            maxLength={FIRST_PARTY_COPY_MAX}
            required
            aria-invalid={invalid || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Purpose</span>
          <textarea
            className={textareaClassName}
            name="purpose"
            defaultValue={draft.copy.purpose}
            maxLength={FIRST_PARTY_COPY_MAX}
            required
            aria-invalid={invalid || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Goal</span>
          <textarea
            className={textareaClassName}
            name="goal"
            defaultValue={draft.copy.goal}
            maxLength={FIRST_PARTY_COPY_MAX}
            required
            aria-invalid={invalid || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Honest hint</span>
          <textarea
            className={textareaClassName}
            name="honest_hint"
            defaultValue={draft.copy.honestHint}
            maxLength={FIRST_PARTY_HINT_MAX}
            required
            aria-invalid={invalid || undefined}
          />
        </label>
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Questions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A counts 4, B counts 3, C counts 2, D counts 1. {draft.items.length} questions
            score {range.min} to {range.max}.
          </p>
        </div>
        {draft.items.map((item, index) => (
          <section
            key={item.id || index}
            className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
          >
            <input type="hidden" name={`q_${index}_id`} value={item.id} />
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-semibold">Question {index + 1}</h3>
              {draft.items.length > 1 ? (
                <Button
                  type="submit"
                  name="remove_question"
                  value={String(index)}
                  variant="outline"
                  size="sm"
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Prompt</span>
              <textarea
                className={textareaClassName}
                name={`q_${index}_prompt`}
                defaultValue={item.prompt}
                maxLength={INSTRUMENT_PROMPT_MAX}
                required
                aria-invalid={invalid || undefined}
              />
            </label>
            {(["a", "b", "c", "d"] as const).map((letter) => (
              <label key={letter} className="block space-y-2">
                <span className="text-sm text-muted-foreground">{letter.toUpperCase()}</span>
                <input
                  className={fieldClassName}
                  name={`q_${index}_${letter}`}
                  defaultValue={item[letter]}
                  maxLength={INSTRUMENT_CHOICE_LABEL_MAX}
                  required
                  aria-invalid={invalid || undefined}
                />
              </label>
            ))}
          </section>
        ))}
        <Button type="submit" name="intent" value="add_question" variant="outline">
          Add question
        </Button>
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Designations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cover every score from {range.min} to {range.max} without gaps or overlap.
          </p>
        </div>
        {draft.bands.map((band, index) => (
          <section
            key={`${band.label}-${index}`}
            className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-base font-semibold">Designation {index + 1}</h3>
              {draft.bands.length > 1 ? (
                <Button
                  type="submit"
                  name="remove_band"
                  value={String(index)}
                  variant="outline"
                  size="sm"
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Low score</span>
                <input
                  className={fieldClassName}
                  name={`band_${index}_min`}
                  type="number"
                  defaultValue={Number.isFinite(band.min) ? band.min : ""}
                  required
                  aria-invalid={invalid || undefined}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">High score</span>
                <input
                  className={fieldClassName}
                  name={`band_${index}_max`}
                  type="number"
                  defaultValue={Number.isFinite(band.max) ? band.max : ""}
                  required
                  aria-invalid={invalid || undefined}
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Name</span>
              <input
                className={fieldClassName}
                name={`band_${index}_label`}
                defaultValue={band.label}
                maxLength={FIRST_PARTY_BAND_LABEL_MAX}
                required
                aria-invalid={invalid || undefined}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Description</span>
              <textarea
                className={textareaClassName}
                name={`band_${index}_description`}
                defaultValue={band.description}
                maxLength={INSTRUMENT_BAND_DESCRIPTION_MAX}
                aria-invalid={invalid || undefined}
              />
            </label>
          </section>
        ))}
        <Button type="submit" name="intent" value="add_band" variant="outline">
          Add designation
        </Button>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" name="intent" value="save" className="w-full sm:w-auto">
          Save assessment
        </Button>
      </div>
    </form>
  );
}
