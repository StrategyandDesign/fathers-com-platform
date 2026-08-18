"use client";

import { useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  className,
  label,
  copiedLabel,
}: {
  value: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const t = useT();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <Button type="button" variant="inverse" className={className} onClick={copy}>
      {status === "copied"
        ? copiedLabel ?? t("common.copied")
        : status === "error"
          ? t("common.copyFailed")
          : label ?? t("common.copy")}
    </Button>
  );
}
