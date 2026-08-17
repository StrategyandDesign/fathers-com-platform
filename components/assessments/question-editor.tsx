"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CustomQuestionType } from "@/lib/assessments/types";
import { fieldClassName, textareaClassName } from "@/lib/ui";

export type QuestionDraft = {
  key: string;
  prompt: string;
  question_type: CustomQuestionType;
  options: string[];
};

function newKey() {
  return crypto.randomUUID();
}

function emptyQuestion(): QuestionDraft {
  return {
    key: newKey(),
    prompt: "",
    question_type: "short_text",
    options: ["", ""],
  };
}

export function AssessmentQuestionEditor({
  name = "questions",
  initialQuestions,
}: {
  name?: string;
  initialQuestions?: QuestionDraft[];
}) {
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialQuestions && initialQuestions.length > 0 ? initialQuestions : [emptyQuestion()]
  );

  const payload = questions.map((question) => ({
    prompt: question.prompt,
    question_type: question.question_type,
    options: question.question_type === "single_select" ? question.options : null,
  }));

  function update(key: string, patch: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question) => (question.key === key ? { ...question, ...patch } : question))
    );
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
    setQuestions((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(payload)} />
      {questions.map((question, index) => (
        <fieldset
          key={question.key}
          className="space-y-4 rounded-xl border border-border bg-black/20 p-4 sm:p-5"
        >
          <legend className="px-1 font-heading text-sm font-semibold">Question {index + 1}</legend>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Prompt</span>
            <textarea
              className={textareaClassName}
              value={question.prompt}
              onChange={(event) => update(question.key, { prompt: event.target.value })}
              rows={3}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Type</span>
            <select
              className={fieldClassName}
              value={question.question_type}
              onChange={(event) =>
                update(question.key, {
                  question_type: event.target.value as CustomQuestionType,
                  options:
                    event.target.value === "single_select" && question.options.length < 2
                      ? ["", ""]
                      : question.options,
                })
              }
            >
              <option value="short_text">Short text</option>
              <option value="single_select">Multiple choice</option>
            </select>
          </label>
          {question.question_type === "single_select" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Options</p>
              {question.options.map((option, optionIndex) => (
                <div key={`${question.key}-opt-${optionIndex}`} className="flex gap-2">
                  <input
                    className={fieldClassName}
                    value={option}
                    onChange={(event) => {
                      const options = [...question.options];
                      options[optionIndex] = event.target.value;
                      update(question.key, { options });
                    }}
                    placeholder={`Option ${optionIndex + 1}`}
                    required
                  />
                  {question.options.length > 2 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() =>
                        update(question.key, {
                          options: question.options.filter((_, i) => i !== optionIndex),
                        })
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
              {question.options.length < 12 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => update(question.key, { options: [...question.options, ""] })}
                >
                  Add option
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={index === questions.length - 1}
              onClick={() => move(index, 1)}
            >
              Move down
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={questions.length === 1}
              onClick={() =>
                setQuestions((current) => current.filter((item) => item.key !== question.key))
              }
            >
              Remove question
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
      >
        Add question
      </Button>
    </div>
  );
}
