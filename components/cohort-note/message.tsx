import { composeCohortNoteParts } from "@/lib/cohort-note/types";

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
      {parts.body ? <p className={parts.stamp ? "mt-2" : undefined}>{parts.body}</p> : null}
    </div>
  );
}
