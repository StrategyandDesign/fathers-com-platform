import { initials } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  src,
  className,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // Signed storage URLs include query tokens; a plain img avoids next/image config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn("rounded-full bg-foreground/10 object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-foreground/10 font-medium",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
