import { saveSetupAnswer } from "@/lib/father/start-actions";
import { radioOptionClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function StartChoiceForm({
  question,
  options,
  selected,
}: {
  question: "children" | "skill" | "when";
  options: Array<{ value: string; label: string }>;
  selected?: string;
}) {
  return (
    <form action={saveSetupAnswer} className="grid gap-2">
      <input type="hidden" name="question" value={question} />
      {options.map((option) => (
        <button
          key={option.value}
          type="submit"
          name="answer"
          value={option.value}
          className={cn(
            radioOptionClassName,
            "w-full min-h-12 justify-start text-left text-base",
            selected === option.value && "border-primary/50 bg-white/5"
          )}
        >
          {option.label}
        </button>
      ))}
    </form>
  );
}
