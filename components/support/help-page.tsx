import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { SupportReportForm } from "@/components/support/report-form";
import { ROLE_HOME } from "@/lib/auth/roles";
import { getI18n } from "@/lib/i18n/server";
import { type SupportSubmitterRole } from "@/lib/support/types";
import { interactiveLinkClassName } from "@/lib/ui";

export async function SupportHelpPage({
  role,
  error,
  notice,
}: {
  role: SupportSubmitterRole;
  error?: string;
  notice?: string;
}) {
  const { t } = await getI18n();
  const homeLabel =
    role === "father" ? t("nav.home") : role === "manager" ? t("nav.dashboard") : t("nav.insights");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href={ROLE_HOME[role]} className={interactiveLinkClassName}>
          {homeLabel}
        </Link>
        <span className="text-white/20">|</span>
        <span>{t("account.help")}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("help.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("help.lead")}
        </p>
      </div>
      <Flash error={error} notice={notice} />
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <SupportReportForm />
      </section>
    </div>
  );
}
