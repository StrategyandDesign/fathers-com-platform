import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { TrainingRequestForm } from "@/components/training-requests/request-form";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { loadManagerGroups } from "@/lib/manager/data";
import { interactiveLinkClassName } from "@/lib/ui";

export default async function ManagerTrainingRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  const groups = await loadManagerGroups(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager" className={interactiveLinkClassName}>
          {t("manager.dashboard.title")}
        </Link>
        <span className="text-white/20">|</span>
        <span>{t("manager.request.title")}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("manager.request.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.request.lead")}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <TrainingRequestForm
          groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        />
      </section>
    </div>
  );
}
