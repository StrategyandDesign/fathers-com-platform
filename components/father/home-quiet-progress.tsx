"use client";

import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/progress";

export function HomeQuietProgress({
  value,
  from,
  label,
}: {
  value: number;
  from?: number;
  label?: string;
}) {
  const start = typeof from === "number" ? from : value;
  const [current, setCurrent] = useState(start);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setCurrent(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <ProgressBar value={current} label={label} />;
}
