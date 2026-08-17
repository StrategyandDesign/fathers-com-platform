"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CoverPhoto } from "@/components/brand/cover";
import { useT } from "@/components/i18n/locale-provider";
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
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fitError, setFitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const preview = localPreview || view.previewUrl || view.defaultUrl;
  const isCustom = Boolean(localPreview) || view.isCustom;
  const name = orgName.trim() || t("manager.photos.thisOrg");
  const previewLabel = isCustom
    ? t("manager.photos.customFor", { name })
    : view.guidance.kind === "home_hero"
      ? t("manager.photos.platformNext")
      : t("manager.photos.platformDefault");
  const surface =
    view.guidance.kind === "home_hero"
      ? t("manager.photos.surfaceHero")
      : view.guidance.kind === "home_profile"
        ? t("manager.photos.surfaceProfile")
        : t("manager.photos.surfaceTraining", {
            title: view.guidance.surface.replace(/^Training card — /, ""),
          });
  const where =
    view.guidance.kind === "home_hero"
      ? t("manager.photos.whereHero", { name })
      : view.guidance.kind === "home_profile"
        ? t("manager.photos.whereProfile", { name })
        : t("manager.photos.whereTraining", { name });
  const aspect =
    view.guidance.kind === "home_hero"
      ? t("manager.photos.anyPhoto")
      : view.guidance.kind === "home_profile"
        ? t("manager.photos.anyPhotoProfile")
        : t("manager.photos.anyPhotoTraining");

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  return (
    <article
      className="overflow-hidden rounded-xl border border-border bg-card"
      aria-busy={pending}
    >
      <div className="space-y-1 px-4 pt-4 sm:px-6 sm:pt-6">
        <h3 className="font-heading text-lg font-semibold tracking-tight">
          {surface}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{where}</p>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6">
        {view.guidance.kind === "home_hero" ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{previewLabel} · {t("manager.photos.home")}</p>
            <div className="relative h-24 overflow-hidden rounded-lg bg-[#101510] sm:h-36 lg:h-44">
              <CoverPhoto src={preview} />
            </div>
          </div>
        ) : view.guidance.kind === "home_profile" ? (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{previewLabel} · {t("manager.photos.homeProfile")}</p>
            <div className="relative min-h-56 overflow-hidden rounded-lg bg-[#101510] sm:min-h-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-[center_62%] opacity-45"
              />
              <div className="absolute inset-0 bg-[#141414]/50" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a]/50 via-[#0a0a0a]/25 to-transparent" />
              <div className="relative z-10 flex min-h-56 flex-col justify-end p-4 sm:min-h-64">
                <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {t("manager.photos.profile")}
                </p>
                <p className="font-heading mt-2 text-lg font-semibold tracking-tight">
                  {t("manager.photos.behindProfile")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{previewLabel} · {t("manager.photos.home")}</p>
              <div className="relative h-28 overflow-hidden rounded-lg bg-[#101510] sm:h-32">
                <CoverPhoto src={preview} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{previewLabel} · {t("manager.photos.trainings")}</p>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-[#101510]">
                <CoverPhoto src={preview} />
              </div>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">{aspect}</p>
        <p className="text-xs text-muted-foreground">{t("manager.photos.fileHint")}</p>
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
              setNotice(null);
              startTransition(async () => {
                try {
                  const fitted = await fitOrgPhotoFile(file, view.guidance.kind);
                  const previewUrl = URL.createObjectURL(fitted);
                  setLocalPreview((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return previewUrl;
                  });
                  const data = new FormData();
                  data.set("group_id", groupId);
                  data.set("slot", view.slot);
                  data.set("photo", fitted);
                  const result = await uploadOrganizationPhoto(data);
                  if (result.error) {
                    setFitError(result.error);
                    return;
                  }
                  setNotice(result.notice ?? t("manager.photos.photoSaved"));
                  router.refresh();
                } catch (error) {
                  setFitError(
                    error instanceof Error
                      ? error.message
                      : t("manager.photos.photoFailed")
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
            {pending ? t("common.saving") : t("manager.photos.replace")}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">{t("manager.photos.choosingSaves")}</p>
        <Flash error={fitError ?? undefined} notice={notice ?? undefined} />

        <form
          action={(formData) => {
            setFitError(null);
            setNotice(null);
            startTransition(async () => {
              const result = await resetOrganizationPhoto(formData);
              if (result.error) {
                setFitError(result.error);
                return;
              }
              setLocalPreview((current) => {
                if (current) URL.revokeObjectURL(current);
                return null;
              });
              setNotice(result.notice ?? t("manager.photos.photoReset"));
              router.refresh();
            });
          }}
          onSubmit={(event) => {
            if (
              !confirm(
                t("manager.photos.resetConfirm", { name })
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
            disabled={pending || !isCustom}
            className="w-full sm:w-auto"
          >
            {t("manager.photos.reset")}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">{t("manager.photos.appliesOnly", { name })}</p>
      </div>
    </article>
  );
}
