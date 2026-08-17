"use client";

import { useState, useTransition } from "react";

import { saveNotificationPreferences } from "@/lib/account/actions";
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
      setMessage("Preferences saved.");
    });
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
      aria-busy={pending}
    >
      <div>
        <h2 className="font-heading text-lg font-semibold">Notification preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved to your account. Emails are sent only for the items you leave on.
        </p>
      </div>
      {toggles.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No email preferences for this role yet. Account and security alerts
          still apply when they ship.
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
                "flex w-full items-start justify-between gap-3 px-4 py-4 text-left sm:gap-4",
                interactiveSurfaceClassName,
                "disabled:opacity-50"
              )}
            >
              <span className="min-w-0">
                <span className="block font-medium leading-snug">{item.label}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{item.hint}</span>
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
                      "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform duration-150 ease-out",
                      prefs[item.key] && "translate-x-5"
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
          Saving…
        </p>
      ) : message ? (
        <p
          className={cn(
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            status === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/25 bg-primary/10 text-foreground"
          )}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
