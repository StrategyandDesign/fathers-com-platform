"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import {
  removeTrainingHandout,
  uploadTrainingHandout,
} from "@/lib/training-handouts/actions";
import type { TrainingHandout } from "@/lib/training-handouts/data";
import { TRAINING_HANDOUT_MAX_COUNT } from "@/lib/storage";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function TrainingHandoutDesk({
  trainingId,
  handouts,
}: {
  trainingId: string;
  handouts: TrainingHandout[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const full = handouts.length >= TRAINING_HANDOUT_MAX_COUNT;

  function removeHandout(handoutId: string) {
    if (!confirm("Remove this PDF from the training?")) return;
    const data = new FormData();
    data.set("training_id", trainingId);
    data.set("handout_id", handoutId);
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await removeTrainingHandout(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotice(result.notice ?? "PDF removed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border px-3 py-3 sm:px-4">
      <div>
        <p className="text-sm text-muted-foreground">Handout (PDF)</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional. PDF only, 5 MB each, up to 3. Saved when you add it. Fathers
          see this on the training overview. Leaders see it under Training
          Summary.
        </p>
      </div>

      {handouts.length > 0 ? (
        <ul className="space-y-2">
          {handouts.map((handout) => (
            <li
              key={handout.id}
              className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <a
                href={handout.href}
                target="_blank"
                rel="noreferrer"
                className={cn("min-w-0 truncate text-sm", interactiveLinkClassName)}
              >
                {handout.fileName}
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                className="w-full sm:w-auto"
                onClick={() => removeHandout(handout.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        disabled={pending || full}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setError(null);
          setNotice(null);
          startTransition(async () => {
            const data = new FormData();
            data.set("training_id", trainingId);
            data.set("handout", file);
            const result = await uploadTrainingHandout(data);
            if (result.error) {
              setError(result.error);
              return;
            }
            setNotice(result.notice ?? "PDF saved.");
            router.refresh();
          });
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={pending || full}
        className="w-full sm:w-auto"
        onClick={() => inputRef.current?.click()}
      >
        {pending ? "Saving…" : full ? "3 PDFs attached" : "Add PDF"}
      </Button>
      <Flash error={error ?? undefined} notice={notice ?? undefined} />
    </div>
  );
}
