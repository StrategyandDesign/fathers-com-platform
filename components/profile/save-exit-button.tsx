"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { useT } from "@/components/i18n/locale-provider";
import { buttonVariants } from "@/components/ui/button";
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
      className={cn(buttonVariants({ variant: "outline" }), "w-full lg:order-3 lg:w-auto")}
    >
      {busy ? t("common.saving") : t("common.saveAndExit")}
    </button>
  );
}
