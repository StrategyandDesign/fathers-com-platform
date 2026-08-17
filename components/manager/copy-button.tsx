"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

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
      {status === "copied" ? "Copied" : status === "error" ? "Couldn’t copy" : "Copy Code"}
    </Button>
  );
}
