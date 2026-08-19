"use client";

import { useEffect, useState } from "react";

type SharedMark = {
  mark: number;
  url: string;
  title?: string;
};

/** Reload the tab when the local checkout moves to a new commit. */
export function DevLiveReload() {
  const [shared, setShared] = useState<SharedMark | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let current: string | null = null;
    let cancelled = false;

    const tick = async () => {
      try {
        const response = await fetch("/api/dev-sync", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          sha?: string | null;
          shared?: SharedMark | null;
        };
        if (data.shared && Number.isInteger(data.shared.mark)) {
          setShared(data.shared);
        }
        if (typeof data.sha !== "string" || !data.sha) return;
        if (current && current !== data.sha) {
          window.location.reload();
          return;
        }
        current = data.sha;
      } catch {
        /* Next may still be starting */
      }
    };

    void tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (process.env.NODE_ENV !== "development" || !shared) return null;

  return (
    <a
      href={shared.url}
      target="_blank"
      rel="noreferrer"
      className="fixed right-3 bottom-3 z-50 rounded-full border border-border bg-card/95 px-3 py-1 text-xs text-muted-foreground shadow-sm"
      title={shared.title || `Shared ${shared.mark}`}
    >
      Shared {shared.mark}
    </a>
  );
}
