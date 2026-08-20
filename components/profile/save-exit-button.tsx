"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { useT } from "@/components/i18n/locale-provider";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function ProfileSaveExitButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const t = useT();
  const { pending } = useFormStatus();
  const [saving, setSaving] = useState(false);
  const busy = pending && saving;
  const label = t("father.profile.saveExit");

  return (
    <button
      type="submit"
      name="intent"
      value="exit"
      formNoValidate
      formAction={action}
      disabled={pending}
      aria-busy={busy || undefined}
      onClick={() => setSaving(true)}
      className={cn(
        "inline-flex min-h-11 items-center text-sm text-muted-foreground",
        interactiveLinkClassName
      )}
    >
      {busy ? t("common.saving") : label}
    </button>
  );
}
