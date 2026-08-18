import { CopyButton } from "@/components/manager/copy-button";
import type { Translate } from "@/lib/i18n/translate";
import {
  snapshotNarrativeVars,
  snapshotTrendCopy,
} from "@/lib/manager/companion";
import type { ImpactSnapshot } from "@/lib/manager/impact";

export function CompanionNarrative({
  snapshot,
  organization,
  t,
}: {
  snapshot: ImpactSnapshot;
  organization: string;
  t: Translate;
}) {
  const trend = snapshotTrendCopy(snapshot);
  const narrative =
    snapshot.enrolled === 0
      ? t("manager.companion.narrativeEmpty", {
          org: organization,
          days: snapshot.periodDays,
        })
      : `${t("manager.companion.narrative", snapshotNarrativeVars(snapshot, organization))} ${t(trend.key, trend.vars)}`;

  return (
    <section className="rounded-xl border border-primary/35 bg-card p-4 sm:p-6">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {t("manager.companion.eyebrow")}
      </p>
      <h2 className="font-heading mt-2 text-lg font-semibold">
        {t("manager.companion.narrativeTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("manager.companion.narrativeLead")}
      </p>
      <p className="mt-5 text-sm leading-relaxed text-foreground">{narrative}</p>
      <CopyButton
        value={narrative}
        className="mt-5 w-full print:hidden sm:w-auto"
        label={t("manager.companion.copyNarrative")}
        copiedLabel={t("manager.companion.copiedNarrative")}
      />
    </section>
  );
}
