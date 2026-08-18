import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ManagerCatalogItem } from "@/lib/manager/catalog";
import type { Translate } from "@/lib/i18n/translate";
import { trainingPartCopyVars } from "@/lib/trainings/series";
import { cn } from "@/lib/utils";

function sessionLabel(count: number, t: Translate) {
  return count === 1
    ? t("manager.dashboard.sessionOne")
    : t("manager.dashboard.sessionMany", { count });
}

function partLabel(item: ManagerCatalogItem, t: Translate) {
  const vars = trainingPartCopyVars(item.training, item.sessionCount);
  if (!vars) return sessionLabel(item.sessionCount, t);
  const { one, ...copy } = vars;
  return one
    ? t("manager.trainings.partSubtitleOne", copy)
    : t("manager.trainings.partSubtitle", copy);
}

function statusLabel(status: ManagerCatalogItem["status"], t: Translate) {
  if (status === "pending") return t("manager.trainings.catalogPending");
  if (status === "ready") return t("manager.trainings.catalogReady");
  return t("manager.trainings.catalogItem");
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
                  <p className="font-medium">{item.training.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[partLabel(item, t), statusLabel(item.status, t), item.groupName]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.training.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.training.description}
                    </p>
                  ) : null}
                </div>
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
