import Link from "next/link";

import { CatalogDecisionButtons } from "@/components/manager/catalog-decision-buttons";
import { CatalogScrollList } from "@/components/manager/catalog-scroll-list";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ManagerCatalogItem } from "@/lib/manager/catalog";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

function sessionLabel(count: number, t: Translate) {
  const n = Number.isFinite(count) ? count : 0;
  return n === 1
    ? t("manager.dashboard.sessionOne")
    : t("manager.dashboard.sessionMany", { count: n });
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
        <CatalogScrollList count={items.length} label={t("manager.trainings.catalogTitle")}>
          {items.map((item) => (
            <li key={item.key} className="px-4 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="font-medium">{item.training.title}</p>
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
              <div className="mt-4 flex flex-row flex-wrap items-center gap-2">
                <CatalogDecisionButtons
                  trainingId={item.training.id}
                  groupId={item.groupId}
                  status={item.status}
                  t={t}
                />
                <Link
                  href={item.href}
                  className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
                >
                  {item.status === "pending"
                    ? t("manager.trainings.preview")
                    : t("manager.trainings.viewTraining")}
                </Link>
              </div>
            </li>
          ))}
        </CatalogScrollList>
      )}
    </section>
  );
}
