import { initials } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function OrganizationMark({
  name,
  logoUrl,
  size = "default",
}: {
  name?: string | null;
  logoUrl?: string | null;
  size?: "default" | "large" | "icon";
}) {
  const label = name?.trim() || null;
  if (!label && !logoUrl) return null;

  if (size === "icon") {
    return (
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10"
        title={label ?? undefined}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-10 max-w-10 object-contain" />
        ) : (
          <span className="text-xs font-medium">{initials(label)}</span>
        )}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={cn(
            "shrink-0 object-contain",
            size === "large" ? "h-10 max-w-16" : "h-8 max-w-14"
          )}
        />
      ) : null}
      {label ? (
        <p className="min-w-0 truncate text-sm text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
