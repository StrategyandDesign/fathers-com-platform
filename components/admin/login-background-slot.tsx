"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useT } from "@/components/i18n/locale-provider";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import {
  resetLoginBackground,
  uploadLoginBackground,
} from "@/lib/platform-photos/actions";
import { fitLoginBackgroundFile } from "@/lib/platform-photos/fit-image";
import { LOGIN_BACKGROUND_SLOT } from "@/lib/platform-photos/slots";

export function LoginBackgroundSlot({
  previewUrl,
  defaultUrl,
  isCustom,
}: {
  previewUrl: string | null;
  defaultUrl: string;
  isCustom: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fitError, setFitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const preview = localPreview || previewUrl || defaultUrl;
  const custom = Boolean(localPreview) || isCustom;

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
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {t("admin.appearance.surface")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.appearance.where")}</p>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">
          {custom ? t("admin.appearance.custom") : t("admin.appearance.platformDefault")}
        </p>
        <div className="relative aspect-[21/9] overflow-hidden rounded-lg bg-[#101510]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0a0f0a]/40" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-28 rounded-md border border-white/20 bg-card px-3 py-4 text-center shadow-lg sm:w-36">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("admin.appearance.windowLabel")}
              </p>
              <p className="mt-1 text-xs font-medium text-card-foreground">
                {t("auth.signIn")}
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t("admin.appearance.anyPhoto")}</p>
        <p className="text-xs text-muted-foreground">{t("admin.appearance.fileHint")}</p>
      </div>

      <div className="space-y-3 border-t border-border px-4 py-4 sm:px-6">
        <form onSubmit={(event) => event.preventDefault()}>
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
                  const fitted = await fitLoginBackgroundFile(file);
                  const previewUrl = URL.createObjectURL(fitted);
                  setLocalPreview((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return previewUrl;
                  });
                  const data = new FormData();
                  data.set("slot", LOGIN_BACKGROUND_SLOT);
                  data.set("photo", fitted);
                  const result = await uploadLoginBackground(data);
                  if (result.error) {
                    setFitError(result.error);
                    return;
                  }
                  setNotice(result.notice ?? t("admin.appearance.photoSaved"));
                  router.refresh();
                } catch (error) {
                  setFitError(
                    error instanceof Error
                      ? error.message
                      : t("admin.appearance.photoFailed")
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
            {pending ? t("common.saving") : t("admin.appearance.replace")}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">{t("admin.appearance.choosingSaves")}</p>
        <Flash error={fitError ?? undefined} notice={notice ?? undefined} />

        <form
          action={(formData) => {
            setFitError(null);
            setNotice(null);
            startTransition(async () => {
              const result = await resetLoginBackground(formData);
              if (result.error) {
                setFitError(result.error);
                return;
              }
              setLocalPreview((current) => {
                if (current) URL.revokeObjectURL(current);
                return null;
              });
              setNotice(result.notice ?? t("admin.appearance.photoReset"));
              router.refresh();
            });
          }}
          onSubmit={(event) => {
            if (!confirm(t("admin.appearance.resetConfirm"))) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="slot" value={LOGIN_BACKGROUND_SLOT} />
          <Button
            type="submit"
            variant="outline"
            disabled={pending || !custom}
            className="w-full sm:w-auto"
          >
            {t("admin.appearance.reset")}
          </Button>
        </form>
      </div>
    </article>
  );
}
