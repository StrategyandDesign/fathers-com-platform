"use client";

import { useState, useTransition } from "react";

import { saveNotificationPreferences } from "@/lib/account/actions";
import { useT } from "@/components/i18n/locale-provider";
import { Flash } from "@/components/manager/flash";
import {
  togglesForRole,
  type NotificationPrefKey,
  type NotificationPreferences,
} from "@/lib/account/preferences";
import type { AppRole } from "@/lib/auth/roles";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function NotificationPrefs({
  role,
  initial,
}: {
  role: AppRole;
  initial: NotificationPreferences;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const t = useT();
  const toggles = togglesForRole(role);

  function toggle(key: NotificationPrefKey) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    startTransition(async () => {
      const result = await saveNotificationPreferences(next);
      if ("error" in result && result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      setStatus("saved");
        setMessage("flash.prefsSaved");
    });
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
      aria-busy={pending}
    >
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("notify.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "manager" ? t("notify.managerLead") : t("notify.otherLead")}
        </p>
      </div>
      {toggles.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          {t("notify.none")}
        </p>
      ) : (
      <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
        {toggles.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[item.key]}
              disabled={pending}
              onClick={() => toggle(item.key)}
              className={cn(
                "flex w-full items-start justify-between gap-3 px-4 py-4 text-start sm:gap-4",
                interactiveSurfaceClassName,
                "disabled:opacity-50"
              )}
            >
              <span className="min-w-0">
                <span className="block font-medium leading-snug">{t(item.labelKey)}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{t(item.hintKey)}</span>
              </span>
              <span
                className="flex h-11 w-14 shrink-0 items-center justify-center"
                aria-hidden
              >
                <span
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors duration-150 ease-out",
                    prefs[item.key] ? "bg-primary" : "bg-white/15"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 start-0.5 size-5 rounded-full bg-white transition-transform duration-150 ease-out",
                      prefs[item.key] && "ltr:translate-x-5 rtl:-translate-x-5"
                    )}
                  />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      )}
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
