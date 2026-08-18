"use client";

import { useT } from "@/components/i18n/locale-provider";
import { dismissStreakNotice } from "@/lib/father/streak-actions";
import type { FatherStreakNotice } from "@/lib/father/streak";
import { interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function sessionCount(t: ReturnType<typeof useT>, n: number) {
  return n === 1 ? t("father.home.sessionOne") : t("father.home.sessionMany", { n });
}

function certificateCount(t: ReturnType<typeof useT>, n: number) {
  return n === 1 ? t("father.home.certificateOne") : t("father.home.certificateMany", { n });
}

function noticeText(t: ReturnType<typeof useT>, notice: FatherStreakNotice) {
  if (notice.kind === "freeze_consumed") {
    return t("father.home.freezeConsumed", { n: notice.payload.freezesRemaining ?? 0 });
  }
  if (notice.kind === "freeze_replenished") {
    return t("father.home.freezeReplenished", { n: notice.payload.freezesRemaining ?? 0 });
  }
  return t("father.home.streakReset", {
    sessions: sessionCount(t, notice.payload.sessions ?? 0),
    certificates: certificateCount(t, notice.payload.certificates ?? 0),
  });
}

export function StreakNotices({ notices }: { notices: FatherStreakNotice[] }) {
  const t = useT();
  if (notices.length === 0) return null;

  return (
    <div className="space-y-2">
      {notices.map((notice) => (
        <aside
          key={notice.id}
          className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm leading-relaxed text-foreground"
        >
          <p>{noticeText(t, notice)}</p>
          <form action={dismissStreakNotice} className="mt-2">
            <input type="hidden" name="notice_id" value={notice.id} />
            <button
              type="submit"
              className={cn(
                "text-sm text-muted-foreground underline underline-offset-4",
                interactiveControlClassName
              )}
            >
              {t("father.home.streakClose")}
            </button>
          </form>
        </aside>
      ))}
    </div>
  );
}
