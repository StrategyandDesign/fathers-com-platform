"use client";

import { useState, useTransition } from "react";

import { saveAnonymousShare } from "@/lib/account/actions";
import { useT } from "@/components/i18n/locale-provider";
import { Flash } from "@/components/manager/flash";
import type { AppRole } from "@/lib/auth/roles";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function AnonymousShareToggle({
  role,
  initial,
}: {
  role: Exclude<AppRole, "admin">;
  initial: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = useT();
  const leadKey =
    role === "father"
      ? "account.shareLeadFather"
      : role === "manager"
        ? "account.shareLeadManager"
        : "account.shareLeadReviewer";

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await saveAnonymousShare(next);
      if ("error" in result && result.error) {
        setEnabled(!next);
        setStatus("error");
        setMessage(result.error);
        return;
      }
      setStatus("saved");
      setMessage("flash.shareSaved");
    });
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
      aria-busy={pending}
    >
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("account.shareTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(leadKey)}</p>
      </div>
      <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
        <li>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={pending}
            onClick={toggle}
            className={cn(
              "flex w-full items-start justify-between gap-3 px-4 py-4 text-start sm:gap-4",
              interactiveSurfaceClassName,
              "disabled:opacity-50"
            )}
          >
            <span className="min-w-0">
              <span className="block font-medium leading-snug">
                {t("account.shareToggle")}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {enabled ? t("account.shareOn") : t("account.shareOff")}
                {". "}
                {t("account.shareHint")}
              </span>
            </span>
            <span className="flex h-11 w-14 shrink-0 items-center justify-center" aria-hidden>
              <span
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors duration-150 ease-out",
                  enabled ? "bg-primary" : "bg-foreground/15"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 start-0.5 size-5 rounded-full bg-white transition-transform duration-150 ease-out",
                    enabled && "ltr:translate-x-5 rtl:-translate-x-5"
                  )}
                />
              </span>
            </span>
          </button>
        </li>
      </ul>
      {pending ? (
        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {t("common.saving")}
        </p>
      ) : message ? (
        <div className="mt-4">
          <Flash
            error={status === "error" ? message : undefined}
            notice={status === "saved" ? message : undefined}
          />
        </div>
      ) : null}
    </section>
  );
}
