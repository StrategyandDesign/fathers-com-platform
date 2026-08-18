import { SkillPromptField } from "@/components/father/skill-prompt";
import type { CheckinQuestion } from "@/lib/father/session-questions";

export function SessionCheckinFields({
  questions,
  answers,
  invalid,
  autoAdvance,
}: {
  questions: CheckinQuestion[];
  answers?: Record<string, string>;
  invalid?: boolean;
  autoAdvance: boolean;
}) {
  return (
    <>
      {questions.map((question) => (
        <SkillPromptField
          key={question.key}
          name={question.key}
          prompt={question.label}
          defaultValue={answers?.[question.key]}
          invalid={invalid}
          autoAdvance={autoAdvance}
        />
      ))}
    </>
  );
}
