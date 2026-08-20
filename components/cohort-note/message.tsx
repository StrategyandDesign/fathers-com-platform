import { cohortNoteSegments } from "@/lib/cohort-note/links";
import { composeCohortNoteParts } from "@/lib/cohort-note/types";
import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function CohortNoteMessage({
  body,
  stamp,
}: {
  body: string;
  stamp?: string | null;
}) {
  const parts = composeCohortNoteParts(body, stamp);
  if (!parts.stamp && !parts.body) return null;

  return (
    <div className="text-sm leading-relaxed sm:text-base">
      {parts.stamp ? <p>{parts.stamp}</p> : null}
      {parts.body ? (
        <p className={parts.stamp ? "mt-2" : undefined}>
          {cohortNoteSegments(parts.body).map((segment, index) =>
            segment.type === "link" ? (
              <a
                key={`${segment.href}-${index}`}
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(interactiveUnderlineClassName, "break-all")}
              >
                {segment.value}
              </a>
            ) : (
              <span key={`text-${index}`}>{segment.value}</span>
            )
          )}
        </p>
      ) : null}
    </div>
  );
}
