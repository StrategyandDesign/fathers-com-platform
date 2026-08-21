"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { HostedFilmPlayer } from "@/components/media/hosted-film-player";
import { buttonVariants } from "@/components/ui/button";
import { interactiveIconClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function TrainingOverviewWatch({
  url,
  title,
  coverSrc,
  watchLabel,
  closeLabel,
  eyebrow,
  notSession,
}: {
  url: string;
  title: string;
  coverSrc?: string | null;
  watchLabel: string;
  closeLabel: string;
  eyebrow: string;
  notSession: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "mt-3 min-h-10 w-full sm:w-auto"
        )}
      >
        {watchLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 outline-none"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-lg sm:inset-x-6 sm:top-[12vh]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-primary/25 bg-primary/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
                  {eyebrow}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{notSession}</p>
              </div>
              <button
                type="button"
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg",
                  interactiveIconClassName
                )}
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <HostedFilmPlayer url={url} title={title} coverSrc={coverSrc} />
          </div>
        </div>
      ) : null}
    </>
  );
}
