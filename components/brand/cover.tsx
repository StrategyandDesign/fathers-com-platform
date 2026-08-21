import { SceneArt } from "@/components/brand/scene";
import { coverObjectClass } from "@/lib/brand/photos";
import { cn } from "@/lib/utils";

export function CoverPhoto({
  src,
  className,
  overlay = true,
}: {
  src?: string | null;
  className?: string;
  overlay?: boolean;
}) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {src ? (
        // Local public photos; plain img matches brand lockup usage.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={cn(
            "absolute inset-0 size-full object-cover",
            coverObjectClass(src)
          )}
        />
      ) : (
        <SceneArt className="absolute inset-0 size-full" />
      )}
      {src && overlay ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
        />
      ) : null}
    </div>
  );
}
