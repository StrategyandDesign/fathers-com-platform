"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";

import { shouldBeginAutoAdvance } from "@/lib/form/auto-advance";

export function useAutoAdvanceSubmit(enabled: boolean, submitterSelector: string) {
  const { pending } = useFormStatus();
  const [advancing, setAdvancing] = useState(false);
  const started = useRef(false);
  const locked = pending || advancing;

  useEffect(() => {
    if (!advancing || pending) return;
    const id = window.setTimeout(() => {
      started.current = false;
      setAdvancing(false);
    }, 12_000);
    return () => window.clearTimeout(id);
  }, [advancing, pending]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const form = input.form;
    if (
      !shouldBeginAutoAdvance({
        enabled,
        locked,
        alreadyStarted: started.current,
        checked: input.checked,
        formValid: Boolean(form?.checkValidity()),
      }) ||
      !form
    ) {
      return;
    }

    started.current = true;
    setAdvancing(true);
    queueMicrotask(() => {
      if (!form.checkValidity()) {
        started.current = false;
        setAdvancing(false);
        return;
      }
      const submitter = form.querySelector<HTMLButtonElement>(submitterSelector);
      form.requestSubmit(submitter ?? undefined);
    });
  }

  return { locked, handleChange };
}
