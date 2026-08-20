import Link from "next/link";

import { LoginBackgroundSlot } from "@/components/admin/login-background-slot";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadLoginBackground } from "@/lib/platform-photos/data";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminAppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const { t } = await getI18n();
  const background = await loadLoginBackground();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin"
          className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
        >
          {t("admin.appearance.backDashboard")}
        </Link>
        <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
          {t("admin.appearance.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.appearance.lead")}</p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />
      <LoginBackgroundSlot
        previewUrl={background.url}
        isCustom={background.isCustom}
      />
    </div>
  );
}
