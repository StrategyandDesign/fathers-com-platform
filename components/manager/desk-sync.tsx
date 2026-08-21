"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  DESK_SYNC_INTERVAL_MS,
  DESK_SYNC_PATH,
  isDeskEditingTarget,
  shouldHoldDeskRefresh,
  shouldRefreshDesk,
} from "@/lib/manager/desk-sync";

/** Keep this Leader's desk in step with the other Leaders on the same org. */
export function ManagerDeskSync() {
  const router = useRouter();

  useEffect(() => {
    let current: string | null = null;
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      const editing = isDeskEditingTarget(document.activeElement);

      try {
        const response = await fetch(DESK_SYNC_PATH, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { version?: string };
        if (typeof data.version !== "string" || !data.version) return;
        if (
          shouldRefreshDesk(current, data.version) &&
          !shouldHoldDeskRefresh({ hidden: false, editing })
        ) {
          router.refresh();
        }
        if (!editing || !current) current = data.version;
      } catch {
        /* Next may still be starting */
      }
    };

    void tick();
    const id = window.setInterval(tick, DESK_SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("focusout", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("focusout", onVisible);
    };
  }, [router]);

  return null;
}
