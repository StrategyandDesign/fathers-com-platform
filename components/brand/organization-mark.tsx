import { cn } from "@/lib/utils";

export function OrganizationMark({
  name,
  logoUrl,
  size = "default",
}: {
  name?: string | null;
  logoUrl?: string | null;
  size?: "default" | "large";
}) {
  const label = name?.trim() || null;
  if (!label && !logoUrl) return null;

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
