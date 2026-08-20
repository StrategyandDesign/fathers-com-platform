import { cn } from "@/lib/utils";

export function hasOrganizationLogo(logoUrl?: string | null) {
  return Boolean(logoUrl?.trim());
}

export function OrganizationMark({
  name,
  logoUrl,
  size = "default",
}: {
  name?: string | null;
  logoUrl?: string | null;
  size?: "default" | "large" | "icon" | "header";
}) {
  const label = name?.trim() || null;
  const logo = logoUrl?.trim() || null;
  if (!label && !logo) return null;

  // Compact chrome is reserved for an uploaded mark. Initials steal space.
  if (size === "icon" || size === "header") {
    if (!logo) return null;
    const header = size === "header";
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white/10",
          header ? "size-8 rounded-md" : "size-10 rounded-lg"
        )}
        title={label ?? undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          className={header ? "h-8 max-w-8 object-contain" : "h-10 max-w-10 object-contain"}
        />
      </span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
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
