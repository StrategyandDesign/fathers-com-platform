import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/translate";
import { compareRows, loadManagerCompare, parseCompareSearchParams } from "@/lib/manager/compare";
import { fieldClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function translateCompareDetail(detail: string, t: Translate) {
  if (detail === "Current members") return t("manager.compare.currentMembers");
  if (detail === "Last 30 days") return t("manager.compare.last30");
  if (detail === "Previous 30 days") return t("manager.compare.previous30");
  if (detail === "Joined this month") return t("manager.compare.joinedThisMonth");
  if (detail === "Joined last month") return t("manager.compare.joinedLastMonth");
  return detail;
}

function translateCompareRowLabel(label: string, t: Translate) {
  if (label === "Enrollment") return t("manager.compare.enrollment");
  if (label === "Start rate") return t("manager.compare.startRate");
  if (label === "Completion rate") return t("manager.compare.completionRate");
  if (label === "Certificates") return t("manager.compare.certificates");
  return label;
}

function translateCompareRowHint(hint: string, t: Translate) {
  if (hint === "People in this group, or who joined in this period.") {
    return t("manager.compare.enrollmentHint");
  }
  if (hint === "Share who began film, check-in, or action.") {
    return t("manager.compare.startHint");
  }
  if (hint === "Share who finished every session in a training.") {
    return t("manager.compare.completionHint");
  }
  if (hint === "On file for the group, or issued in the period.") {
    return t("manager.compare.certificatesHint");
  }
  return hint;
}

function translateOfCount(detail: string | undefined, t: Translate) {
  if (!detail) return undefined;
  const match = detail.match(/^(\d+) of (\d+)$/);
  if (!match) return detail;
  return t("manager.compare.ofEnrolled", { count: match[1], enrolled: match[2] });
}

export async function ComparePanel({
  managerId,
  locale,
  t,
  params,
}: {
  managerId: string;
  locale: Locale;
  t: Translate;
  params: {
    mode?: string;
    window?: string;
    left?: string;
    right?: string;
  };
}) {
  const filters = parseCompareSearchParams(params);
  const comparison = await loadManagerCompare(managerId, filters, locale);
  const rows =
    comparison.left && comparison.right
      ? compareRows(comparison.left, comparison.right)
      : [];

  return (
    <div className="space-y-6">
      <Flash error={comparison.error} />
      <form
        method="get"
        action="/manager/impact"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <input type="hidden" name="tab" value="compare" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("manager.compare.mode")}</span>
            <select className={fieldClassName} name="mode" defaultValue={comparison.mode}>
              <option value="periods">{t("manager.compare.periods")}</option>
              <option value="groups">{t("manager.compare.groups")}</option>
            </select>
          </label>
          {comparison.mode === "periods" ? (
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">{t("manager.compare.window")}</span>
              <select className={fieldClassName} name="window" defaultValue={comparison.window}>
                <option value="month">{t("manager.compare.month")}</option>
                <option value="30">{t("manager.compare.days30")}</option>
              </select>
            </label>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">{t("manager.compare.left")}</span>
                <select
                  className={fieldClassName}
                  name="left"
                  defaultValue={comparison.left?.key ?? ""}
                >
                  {comparison.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">{t("manager.compare.right")}</span>
                <select
                  className={fieldClassName}
                  name="right"
                  defaultValue={comparison.right?.key ?? ""}
                >
                  {comparison.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <Button type="submit" className="mt-5 w-full sm:w-auto">
          {t("manager.compare.update")}
        </Button>
      </form>

      {comparison.left && comparison.right ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                {t("manager.compare.left")}
              </p>
              <h2 className="font-heading mt-2 text-xl font-semibold tracking-tight">
                {translateCompareDetail(comparison.left.label, t)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {translateCompareDetail(comparison.left.detail, t)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                {t("manager.compare.right")}
              </p>
              <h2 className="font-heading mt-2 text-xl font-semibold tracking-tight">
                {translateCompareDetail(comparison.right.label, t)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {translateCompareDetail(comparison.right.detail, t)}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-4 sm:px-6">
              <h2 className="font-heading text-lg font-semibold">
                {t("manager.compare.vs", {
                  left: translateCompareDetail(comparison.left.label, t),
                  right: translateCompareDetail(comparison.right.label, t),
                })}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {comparison.mode === "groups"
                  ? t("manager.compare.membersLead")
                  : t("manager.compare.periodLead")}
              </p>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li
                  key={row.label}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:px-6"
                >
                  <div>
                    <p className="font-medium">{translateCompareRowLabel(row.label, t)}</p>
                    <p className="text-sm text-muted-foreground">
                      {translateCompareRowHint(row.hint, t)}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{row.left}</p>
                    {row.leftDetail ? (
                      <p className="text-sm text-muted-foreground">
                        {translateOfCount(row.leftDetail, t)}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-muted-foreground">
                      {row.right}
                    </p>
                    {row.rightDetail ? (
                      <p className="text-sm text-muted-foreground">
                        {translateOfCount(row.rightDetail, t)}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "text-sm tabular-nums",
                      row.better === "same" ? "text-muted-foreground" : "text-primary"
                    )}
                  >
                    {row.delta}
                    {row.better === "left"
                      ? ` ${t("manager.compare.leftDelta")}`
                      : row.better === "right"
                        ? ` ${t("manager.compare.rightDelta")}`
                        : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <EmptyState
          title={t("manager.compare.emptyTitle")}
          actionHref="/manager"
          actionLabel={t("manager.participants.openDashboard")}
        >
          {comparison.mode === "groups"
            ? t("manager.compare.emptyGroups")
            : t("manager.compare.emptyPeriods")}
        </EmptyState>
      )}
    </div>
  );
}
