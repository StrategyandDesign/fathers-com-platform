import { formatSharedLabel, loadSharedMark } from "@/lib/dev/shared-mark";

/** Bottom-right Shared 1-1.01 from shared-mark.json. Same label as SHARED.md. */
export function VersionStamp() {
  if (process.env.NODE_ENV === "production") return null;
  const shared = loadSharedMark();
  if (!shared) return null;
  const label = shared.label || formatSharedLabel(shared.mark, shared.patch);

  return (
    <a
      href={shared.url}
      target="_blank"
      rel="noreferrer"
      className="fixed end-3 bottom-3 z-50 rounded-full border border-border bg-card/95 px-3 py-1 text-xs text-muted-foreground shadow-sm print:hidden"
      title={shared.title || label}
    >
      {label}
    </a>
  );
}
