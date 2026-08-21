import Link from "next/link";

import { StaffMessageForm } from "@/components/admin/staff-message-form";
import { Flash } from "@/components/manager/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { formatShortDate } from "@/lib/manager/types";
import {
  loadAdminStaffMessages,
  loadStaffMessageDirectory,
} from "@/lib/staff-messages/data";
import type { StaffMessageAudience } from "@/lib/staff-messages/types";
import { interactiveLinkClassName } from "@/lib/ui";

function audienceLabel(
  audience: StaffMessageAudience,
  t: (key: string) => string
) {
  if (audience === "all_leaders") return t("admin.messages.allLeaders");
  if (audience === "selected_leaders") return t("admin.messages.selectedLeaders");
  if (audience === "all_reviewers") return t("admin.messages.allReviewers");
  if (audience === "selected_reviewers") return t("admin.messages.selectedReviewers");
  return t("admin.messages.allStaff");
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("admin");
  const { t } = await getI18n();
  const [people, history] = await Promise.all([
    loadStaffMessageDirectory(),
    loadAdminStaffMessages(),
  ]);

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin" className={interactiveLinkClassName}>
          {t("admin.appearance.backDashboard")}
        </Link>
        <span className="text-white/20">|</span>
        <span>{t("admin.messages.title")}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("admin.messages.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.messages.lead")}</p>
      </div>
      <Flash error={params.error} notice={params.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">{t("admin.messages.compose")}</h2>
        <div className="mt-5">
          <StaffMessageForm people={people} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">{t("admin.messages.history")}</h2>
        {history.length === 0 ? (
          <EmptyState title={t("admin.messages.emptyHistory")}>
            {t("admin.messages.lead")}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {history.map((row) => (
              <li key={row.id} className="px-4 py-4 sm:px-6">
                <p className="text-sm text-foreground">{row.body}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[
                    formatShortDate(row.createdAt),
                    audienceLabel(row.audience, t),
                    t("admin.messages.reached", { n: row.recipientCount }),
                    row.dismissedCount
                      ? t("admin.messages.dismissedCount", { n: row.dismissedCount })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
