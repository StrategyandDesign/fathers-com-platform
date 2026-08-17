"use client";

import { useFormStatus } from "react-dom";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { sessionCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function SessionAdvanceButton({
  label,
  visuallyHidden = false,
}: {
  label: string;
  visuallyHidden?: boolean;
}) {
  const { pending } = useFormStatus();
  const t = useT();

  return (
    <div className={cn("flex justify-center max-lg:block", visuallyHidden && "sr-only")}>
      <Button
        type="submit"
        variant="inverse"
        size="lg"
        data-session-advance
        disabled={pending}
        className={sessionCtaClassName}
      >
        {pending ? t("common.saving") : label}
      </Button>
    </div>
  );
}
