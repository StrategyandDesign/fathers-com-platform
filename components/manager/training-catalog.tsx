import Link from "next/link";

import { CatalogDecisionButtons } from "@/components/manager/catalog-decision-buttons";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ManagerCatalogItem, ManagerCatalogStatus } from "@/lib/manager/catalog";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

function sessionLabel(count: number, t: Translate) {
  return count === 1
    ? t("manager.dashboard.sessionOne")
    : t("manager.dashboard.sessionMany", { count });
}

function statusCopy(status: ManagerCatalogStatus, t: Translate) {
  if (status === "pending") return t("manager.trainings.catalogPending");
  if (status === "declined") return t("manager.trainings.catalogDeclined");
  if (status === "ready") return t("manager.trainings.catalogReady");
  return t("manager.trainings.catalogItem");
}

function StatusMark({ status, t }: { status: ManagerCatalogStatus; t: Translate }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] uppercase",
        status === "declined" && "border-destructive/40 text-destructive",
        status === "pending" && "border-border text-muted-foreground",
        (status === "ready" || status === "catalog") && "border-primary/40 text-primary"
      )}
    >
      {statusCopy(status, t)}
    </span>
  );
}

export function TrainingCatalog({
  items,
  t,
}: {
  items: ManagerCatalogItem[];
  t: Translate;
}) {
  return (
    <section id="catalog" className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("manager.trainings.catalogTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("manager.trainings.catalogLead")}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("manager.trainings.catalogEmptyTitle")}>
          {t("manager.trainings.catalogEmptyBody")}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item) => (
            <li key={item.key} className="px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.training.title}</p>
                    <StatusMark status={item.status} t={t} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      sessionLabel(item.sessionCount, t),
                      item.groupName,
                      item.training.attribution
                        ? t("manager.trainings.fromSource", { name: item.training.attribution })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.training.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.training.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <CatalogDecisionButtons
                  trainingId={item.training.id}
                  groupId={item.groupId}
                  status={item.status}
                  t={t}
                />
                <Link
                  href={item.href}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-11 sm:w-auto")}
                >
                  {item.status === "pending"
                    ? t("manager.trainings.preview")
                    : t("manager.trainings.viewTraining")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
