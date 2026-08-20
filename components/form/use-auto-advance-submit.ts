"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";

import { shouldBeginAutoAdvance } from "@/lib/form/auto-advance";

export function useAutoAdvanceSubmit(
  enabled: boolean,
  submitterSelector: string,
  delayMs = 0
) {
  const { pending } = useFormStatus();
  const [advancing, setAdvancing] = useState(false);
  const started = useRef(false);
  const delayTimer = useRef<number | null>(null);
  const locked = pending || advancing;

  useEffect(() => {
    if (!advancing || pending) return;
    const id = window.setTimeout(() => {
      started.current = false;
      setAdvancing(false);
    }, 12_000);
    return () => window.clearTimeout(id);
  }, [advancing, pending]);

  useEffect(() => {
    return () => {
      if (delayTimer.current != null) window.clearTimeout(delayTimer.current);
    };
  }, []);

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

    const submit = () => {
      if (!form.checkValidity()) {
        started.current = false;
        setAdvancing(false);
        return;
      }
      const submitter = form.querySelector<HTMLButtonElement>(submitterSelector);
      form.requestSubmit(submitter ?? undefined);
    };

    if (delayMs > 0) {
      const cancelDelay = () => {
        if (delayTimer.current == null) return;
        window.clearTimeout(delayTimer.current);
        delayTimer.current = null;
        started.current = false;
        setAdvancing(false);
      };
      form.addEventListener("submit", cancelDelay, { once: true });
      delayTimer.current = window.setTimeout(() => {
        form.removeEventListener("submit", cancelDelay);
        submit();
      }, delayMs);
      return;
    }

    queueMicrotask(submit);
  }

  return { locked, handleChange };
}
