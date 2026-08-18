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
  if (!src) {
    return <SceneArt className={className} />;
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* Local public photos; plain img matches brand lockup usage. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={cn("h-full w-full object-cover", coverObjectClass(src))}
      />
      {overlay ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
        />
      ) : null}
    </div>
  );
}
