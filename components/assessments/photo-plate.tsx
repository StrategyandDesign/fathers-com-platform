import { cn } from "@/lib/utils";

export function AssessmentPhotoPlate({
  src,
  completed = false,
  className,
  children,
}: {
  src: string;
  completed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-cover",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* Local public photo or org override; plain img matches CoverPhoto usage. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover object-[center_62%] opacity-45"
        />
        <div className="absolute inset-0 bg-card/50" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a]/55 via-[#0a0a0a]/25 to-transparent" />
        {completed ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c]/70 to-[#101510]/80" />
        ) : null}
      </div>
      <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
    </div>
  );
}
