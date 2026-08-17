export function Flash({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  if (!error && !notice) return null;

  return (
    <div className="space-y-2">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
