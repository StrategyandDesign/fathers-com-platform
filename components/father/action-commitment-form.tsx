"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  INTENTION_LABEL_KEYS,
  INTENTION_OPTIONS,
  OUTCOME_NOTE_MAX,
  type IntentionOption,
} from "@/lib/father/action-commitment";
import { fieldClassName, homePrimaryCtaClassName, interactiveControlClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function ActionCommitmentForm({
  sessionId,
  defaultOption,
  defaultDate,
  defaultTime,
  timezone,
  action,
}: {
  sessionId: string;
  defaultOption?: IntentionOption | null;
  defaultDate?: string | null;
  defaultTime?: string | null;
  timezone: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const t = useT();
  const [option, setOption] = useState<IntentionOption>(defaultOption ?? "tonight");
  const [zone, setZone] = useState(timezone);

  useEffect(() => {
    const next = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (next) setZone(next);
  }, []);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="timezone" value={zone} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("father.session.whenWillYou")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {INTENTION_OPTIONS.map((value) => (
            <label
              key={value}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-3 text-center text-sm",
                interactiveControlClassName,
                "has-[:checked]:border-primary"
              )}
            >
              <input
                type="radio"
                name="intention"
                value={value}
                checked={option === value}
                onChange={() => setOption(value)}
                required
                className="sr-only"
              />
              <span className="min-w-0 leading-snug">{t(INTENTION_LABEL_KEYS[value])}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {option === "custom" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block min-w-0 space-y-2">
            <span className="text-sm text-muted-foreground">{t("notify.day")}</span>
            <input
              className={fieldClassName}
              type="date"
              name="custom_date"
              defaultValue={defaultDate ?? ""}
              required
            />
          </label>
          <label className="block min-w-0 space-y-2">
            <span className="text-sm text-muted-foreground">{t("father.start.reminderTime")}</span>
            <input
              className={fieldClassName}
              type="time"
              name="custom_time"
              defaultValue={defaultTime ?? "19:00"}
              required
            />
          </label>
        </div>
      ) : null}
      <ActionPrimaryButton label={t("father.session.lockItIn")} />
    </form>
  );
}

export function ActionDoneForm({
  sessionId,
  action,
}: {
  sessionId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const t = useT();
  return (
    <form action={action}>
      <input type="hidden" name="session_id" value={sessionId} />
      <ActionPrimaryButton label={t("father.session.iDidIt")} />
    </form>
  );
}

export function ActionFinishForm({
  sessionId,
  defaultNote,
  action,
}: {
  sessionId: string;
  defaultNote?: string | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const t = useT();
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="session_id" value={sessionId} />
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("father.session.whatHappened")}</span>
        <input
          className={fieldClassName}
          type="text"
          name="outcome_note"
          maxLength={OUTCOME_NOTE_MAX}
          defaultValue={defaultNote ?? ""}
          placeholder={t("father.session.outcomePlaceholder")}
          autoComplete="off"
        />
      </label>
      <ActionPrimaryButton label={t("father.session.finishSession")} />
    </form>
  );
}

function ActionPrimaryButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <Button
      type="submit"
      variant="default"
      size="lg"
      disabled={pending}
      className={homePrimaryCtaClassName}
    >
      {pending ? t("common.saving") : label}
    </Button>
  );
}
