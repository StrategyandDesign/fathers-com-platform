import type { Translate } from "@/lib/i18n/translate";
import { filmRuntimeMinutes } from "@/lib/trainings/runtime";
import { cn } from "@/lib/utils";

export function filmRuntimeLabel(
  seconds: number | null | undefined,
  t: Translate
) {
  const minutes = filmRuntimeMinutes(seconds);
  if (minutes == null) return null;
  return t("father.session.runtime", { n: minutes });
}

export function FilmRuntime({
  seconds,
  t,
  className,
}: {
  seconds: number | null | undefined;
  t: Translate;
  className?: string;
}) {
  const label = filmRuntimeLabel(seconds, t);
  if (!label) return null;
  return <p className={cn("text-sm text-muted-foreground", className)}>{label}</p>;
}

export function FilmRuntimeChip({
  seconds,
  t,
  className,
}: {
  seconds: number | null | undefined;
  t: Translate;
  className?: string;
}) {
  const label = filmRuntimeLabel(seconds, t);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border border-border px-2 text-xs text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}
