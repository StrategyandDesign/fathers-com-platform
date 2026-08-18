import {
  FILM_RUNTIME_MISSING,
  formatFilmClock,
  sessionFilmFlag,
  trainingFilmFlags,
} from "@/lib/trainings/runtime";

export function AdminFilmFlags({
  sessions,
}: {
  sessions: Array<{
    session_number: number;
    title: string;
    duration_seconds?: number | null;
  }>;
}) {
  const { missing, overages } = trainingFilmFlags(sessions);
  if (!missing && overages.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {overages.map((flag) => (
        <p key={`${flag.sessionNumber}-${flag.overage}`} className="text-sm text-foreground">
          Session {flag.sessionNumber}: {flag.overage}
        </p>
      ))}
      {missing ? <p className="text-sm text-foreground">{FILM_RUNTIME_MISSING}</p> : null}
    </div>
  );
}

export function AdminSessionFilmFlags({
  session,
}: {
  session: {
    session_number: number;
    title: string;
    duration_seconds?: number | null;
  };
}) {
  const flag = sessionFilmFlag(session);
  if (!flag.missing && !flag.overage) return null;

  return (
    <div className="space-y-1">
      {flag.overage ? <p className="text-sm text-foreground">{flag.overage}</p> : null}
      {flag.missing ? <p className="text-sm text-foreground">{FILM_RUNTIME_MISSING}</p> : null}
    </div>
  );
}

export function adminDurationHint(seconds: number | null | undefined) {
  if (seconds == null) return "Whole seconds or m:ss. Required before publish.";
  return `Currently ${formatFilmClock(seconds)}. Whole seconds or m:ss.`;
}
