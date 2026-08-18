"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { ActionIntentionList } from "@/components/father/action-skill-card";
import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  OUTCOME_NOTE_MAX,
  type IntentionOption,
} from "@/lib/father/action-commitment";
import { fieldClassName, homePrimaryCtaClassName } from "@/lib/ui";

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
    <form action={action} className="space-y-8">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="timezone" value={zone} />
      <fieldset className="space-y-4">
        <legend className="text-sm text-muted-foreground">{t("father.session.whenWillYou")}</legend>
        <ActionIntentionList t={t} value={option} onChange={setOption} />
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
    <form action={action} className="space-y-8">
      <input type="hidden" name="session_id" value={sessionId} />
      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">{t("father.session.whatHappened")}</span>
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
