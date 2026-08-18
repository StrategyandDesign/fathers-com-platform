"use client";

import { useT } from "@/components/i18n/locale-provider";
import { translateFlash } from "@/lib/i18n/flash";

export function Flash({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  const t = useT();
  const errorText = translateFlash(error, t);
  const noticeText = translateFlash(notice, t);
  if (!errorText && !noticeText) return null;

  return (
    <div className="space-y-2">
      {errorText ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorText}
        </p>
      ) : null}
      {noticeText ? (
        <p
          role="status"
          className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground"
        >
          {noticeText}
        </p>
      ) : null}
    </div>
  );
}
