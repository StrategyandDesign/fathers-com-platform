"use client";

import { useEffect } from "react";

/** Reload the tab when the local checkout moves to a new commit. */
export function DevLiveReload() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let current: string | null = null;
    let cancelled = false;

    const tick = async () => {
      try {
        const response = await fetch("/api/dev-sync", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { sha?: string | null };
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

  return null;
}
