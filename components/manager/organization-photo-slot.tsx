"use client";

import { useRef, useState, useTransition } from "react";

import { CoverPhoto } from "@/components/brand/cover";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import {
  resetOrganizationPhoto,
  uploadOrganizationPhoto,
} from "@/lib/org-photos/actions";
import { fitOrgPhotoFile } from "@/lib/org-photos/fit-image";
import type { OrganizationPhotoSlotView } from "@/lib/org-photos/slots";

export function OrganizationPhotoSlot({
  groupId,
  orgName,
  view,
}: {
  groupId: string;
  orgName: string;
  view: OrganizationPhotoSlotView;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fitError, setFitError] = useState<string | null>(null);
  const preview = view.previewUrl || view.defaultUrl;
  const name = orgName.trim() || "this organization";

  return (
    <article
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-busy={pending}
    >
      <div className="space-y-1 px-4 pt-4 sm:px-6 sm:pt-6">
        <h3 className="font-heading text-lg font-semibold tracking-tight">
          {view.guidance.surface}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{view.where}</p>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6">
        {view.guidance.kind === "home_hero" ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{view.previewLabel} · Home</p>
            <div className="relative h-24 overflow-hidden rounded-lg bg-[#101510] sm:h-36 lg:h-44">
              <CoverPhoto src={preview} />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{view.previewLabel} · Home</p>
              <div className="relative h-28 overflow-hidden rounded-lg bg-[#101510] sm:h-32">
                <CoverPhoto src={preview} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{view.previewLabel} · Trainings</p>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-[#101510]">
                <CoverPhoto src={preview} />
              </div>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">{view.guidance.aspectLabel}</p>
        <p className="text-xs text-muted-foreground">{view.guidance.fileHint}</p>
      </div>

      <div className="space-y-3 border-t border-border px-4 py-4 sm:px-6">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              setFitError(null);
              startTransition(async () => {
                try {
                  const fitted = await fitOrgPhotoFile(file, view.guidance.kind);
                  const data = new FormData();
                  data.set("group_id", groupId);
                  data.set("slot", view.slot);
                  data.set("photo", fitted);
                  await uploadOrganizationPhoto(data);
                } catch (error) {
                  if (
                    typeof error === "object" &&
                    error &&
                    "digest" in error &&
                    typeof error.digest === "string" &&
                    error.digest.startsWith("NEXT_REDIRECT")
                  ) {
                    throw error;
                  }
                  setFitError(
                    error instanceof Error
                      ? error.message
                      : "Couldn’t use that photo. Try another."
                  );
                }
              });
            }}
          />
          <Button
            type="button"
            disabled={pending}
            className="w-full sm:w-auto"
            onClick={() => inputRef.current?.click()}
          >
            {pending ? "Fitting photo…" : "Replace Photo"}
          </Button>
        </form>
        <Flash error={fitError ?? undefined} />

        <form
          action={(formData) => {
            startTransition(() => {
              void resetOrganizationPhoto(formData);
            });
          }}
          onSubmit={(event) => {
            if (
              !confirm(
                `Reset this photo to the platform default for ${name}?`
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="slot" value={view.slot} />
          <Button
            type="submit"
            variant="outline"
            disabled={pending || !view.isCustom}
            className="w-full sm:w-auto"
          >
            Reset to Default
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">{view.applies}</p>
      </div>
    </article>
  );
}
