"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { saveOnboardingReminder, skipOnboardingReminder } from "@/lib/father/start-actions";
import { fieldClassName, homePrimaryCtaClassName, interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function StartReminderForm({
  weekday,
  remindAt,
  weekdayLabels,
  timeLabel,
  submitLabel,
  skipLabel,
}: {
  weekday: number | null;
  remindAt: string;
  weekdayLabels: string[];
  timeLabel: string;
  submitLabel: string;
  skipLabel: string;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(weekday);
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    if (weekday == null) {
      setSelectedDay(new Date().getDay());
    }
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) setTimezone(zone);
  }, [weekday]);

  return (
    <div className="space-y-3">
      <form action={saveOnboardingReminder} className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {WEEKDAYS.map((day) => (
            <label
              key={day}
              className={cn(
                "flex min-h-12 min-w-0 cursor-pointer items-center justify-center rounded-lg border border-border px-3 text-center text-sm",
                interactiveControlClassName,
                "has-[:checked]:border-primary/50 has-[:checked]:bg-white/5"
              )}
            >
              <input
                type="radio"
                name="weekday"
                value={day}
                checked={selectedDay === day}
                onChange={() => setSelectedDay(day)}
                required
                className="sr-only"
              />
              <span className="min-w-0 truncate">{weekdayLabels[day]}</span>
            </label>
          ))}
        </div>
        <label className="block min-w-0 space-y-2">
          <span className="text-sm text-muted-foreground">{timeLabel}</span>
          <input
            className={fieldClassName}
            type="time"
            name="remind_at"
            defaultValue={remindAt}
            required
          />
        </label>
        <input type="hidden" name="timezone" value={timezone} />
        <Button type="submit" variant="default" size="lg" className={homePrimaryCtaClassName}>
          {submitLabel}
        </Button>
      </form>
      <form action={skipOnboardingReminder}>
        <Button type="submit" variant="outline" className="w-full min-h-11">
          {skipLabel}
        </Button>
      </form>
    </div>
  );
}
