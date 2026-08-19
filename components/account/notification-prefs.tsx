"use client";

import { useEffect, useState, useTransition } from "react";

import { saveNotificationPreferences, saveNotificationSchedule } from "@/lib/account/actions";
import { useT } from "@/components/i18n/locale-provider";
import { Flash } from "@/components/manager/flash";
import { PushDeviceButton } from "@/components/father/push-device-button";
import {
  togglesForRole,
  type NotificationPrefKey,
  type NotificationPreferences,
} from "@/lib/account/preferences";
import type { AppRole } from "@/lib/auth/roles";
import { fieldClassName, homePrimaryCtaClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ScheduleFields = {
  reminderDay: number | null;
  reminderTime: string | null;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export function NotificationPrefs({
  role,
  initial,
  schedule,
}: {
  role: AppRole;
  initial: NotificationPreferences;
  schedule?: ScheduleFields;
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
                    prefs[item.key] ? "bg-primary" : "bg-foreground/15"
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
      {role === "father" && schedule ? (
        <ReminderScheduleForm
          initial={schedule}
          onResult={(nextStatus, nextMessage) => {
            setStatus(nextStatus);
            setMessage(nextMessage);
          }}
        />
      ) : null}
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

function ReminderScheduleForm({
  initial,
  onResult,
}: {
  initial: ScheduleFields;
  onResult: (status: "saved" | "error", message: string) => void;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [timezone, setTimezone] = useState(initial.timezone);

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) setTimezone(zone);
  }, []);

  return (
    <form
      className="mt-6 space-y-4 border-t border-border pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await saveNotificationSchedule({
            reminderDay: Number.parseInt(String(form.get("weekday") ?? ""), 10),
            reminderTime: String(form.get("remind_at") ?? ""),
            timezone,
            quietHoursStart: String(form.get("quiet_start") ?? ""),
            quietHoursEnd: String(form.get("quiet_end") ?? ""),
          });
          if ("error" in result && result.error) {
            onResult("error", result.error);
            return;
          }
          onResult("saved", "flash.prefsSaved");
        });
      }}
    >
      <p className="text-sm font-medium">{t("notify.weeklyWhen")}</p>
      <p className="text-sm text-muted-foreground">{t("notify.weeklyWhenHint")}</p>
      <label className="block min-w-0 space-y-2">
        <span className="text-sm text-muted-foreground">{t("notify.day")}</span>
        <select
          name="weekday"
          defaultValue={initial.reminderDay ?? ""}
          className={fieldClassName}
        >
          <option value="">{t("notify.weeklyNone")}</option>
          {[
            t("father.start.daySun"),
            t("father.start.dayMon"),
            t("father.start.dayTue"),
            t("father.start.dayWed"),
            t("father.start.dayThu"),
            t("father.start.dayFri"),
            t("father.start.daySat"),
          ].map((label, day) => (
            <option key={day} value={day}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0 space-y-2">
        <span className="text-sm text-muted-foreground">{t("father.start.reminderTime")}</span>
        <input
          className={fieldClassName}
          type="time"
          name="remind_at"
          defaultValue={initial.reminderTime ?? "19:00"}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0 space-y-2">
          <span className="text-sm text-muted-foreground">{t("notify.quietStart")}</span>
          <input
            className={fieldClassName}
            type="time"
            name="quiet_start"
            defaultValue={initial.quietHoursStart}
            required
          />
        </label>
        <label className="block min-w-0 space-y-2">
          <span className="text-sm text-muted-foreground">{t("notify.quietEnd")}</span>
          <input
            className={fieldClassName}
            type="time"
            name="quiet_end"
            defaultValue={initial.quietHoursEnd}
            required
          />
        </label>
      </div>
      <input type="hidden" name="timezone" value={timezone} />
      <Button type="submit" variant="default" size="lg" className={homePrimaryCtaClassName} disabled={pending}>
        {t("notify.saveSchedule")}
      </Button>
      <PushDeviceButton />
    </form>
  );
}
