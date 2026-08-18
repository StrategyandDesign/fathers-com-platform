"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { OrganizationMark } from "@/components/brand/organization-mark";
import { useT } from "@/components/i18n/locale-provider";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import {
  resetOrganizationPhoto,
  uploadOrganizationPhoto,
} from "@/lib/org-photos/actions";
import { ORG_LOGO_SLOT } from "@/lib/org-photos/slots";

export function OrganizationLogoCard({
  groupId,
  name,
  logoUrl,
}: {
  groupId: string;
  name: string;
  logoUrl: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl);
  const markName = name.trim() || t("manager.impact.yourOrg");

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-busy={pending}>
      <h2 className="font-heading text-lg font-semibold">{t("account.logoTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("account.logoLead", { name: markName })}
      </p>

      <div className="mt-5 rounded-lg border border-border bg-black/30 px-4 py-3">
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {t("account.logoPreview")}
        </p>
        <div className="mt-3">
          {previewUrl || markName ? (
            <OrganizationMark name={markName} logoUrl={previewUrl} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("account.logoEmpty")}</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{t("account.logoHint")}</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
            setError(null);
            setNotice(null);
            startTransition(async () => {
              const data = new FormData();
              data.set("group_id", groupId);
              data.set("slot", ORG_LOGO_SLOT);
              data.set("photo", file);
              const result = await uploadOrganizationPhoto(data);
              if (result.error) {
                setError(result.error);
                return;
              }
              setPreviewUrl(URL.createObjectURL(file));
              setNotice(t("account.logoSaved"));
              router.refresh();
            });
          }}
        />
        <Button
          type="button"
          disabled={pending}
          className="w-full sm:w-auto"
          onClick={() => inputRef.current?.click()}
        >
          {pending
            ? t("common.saving")
            : previewUrl
              ? t("account.logoReplace")
              : t("account.logoUpload")}
        </Button>
        {previewUrl ? (
          <form
            action={(formData) => {
              setError(null);
              setNotice(null);
              startTransition(async () => {
                const result = await resetOrganizationPhoto(formData);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setPreviewUrl(null);
                setNotice(t("account.logoRemoved"));
                router.refresh();
              });
            }}
          >
            <input type="hidden" name="group_id" value={groupId} />
            <input type="hidden" name="slot" value={ORG_LOGO_SLOT} />
            <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
              {t("account.logoRemove")}
            </Button>
          </form>
        ) : null}
      </div>
      <Flash error={error ?? undefined} notice={notice ?? undefined} />
    </section>
  );
}
