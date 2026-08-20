"use client";

import { useEffect, useState, type ReactNode } from "react";

const HOLD_MS = 1200;

export function KeystoneArrival({
  children,
  hold = false,
}: {
  children: ReactNode;
  hold?: boolean;
}) {
  const [ready, setReady] = useState(!hold);

  useEffect(() => {
    if (!hold) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setReady(true);
      return;
    }
    const id = window.setTimeout(() => setReady(true), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [hold]);

  if (!ready) {
    return <div className="min-h-[70vh]" aria-hidden />;
  }

  return <>{children}</>;
}
