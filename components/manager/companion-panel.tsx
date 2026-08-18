import Link from "next/link";

import { CompanionFrame } from "@/components/manager/companion-frame";
import { CompanionNudgeSuggest } from "@/components/manager/companion-nudge-suggest";
import { buttonVariants } from "@/components/ui/button";
import { initials, interactiveLinkClassName } from "@/lib/ui";
import type { Translate } from "@/lib/i18n/translate";
import type { CompanionBriefing } from "@/lib/manager/companion";
import { cn } from "@/lib/utils";

export function CompanionPanel({
  briefing,
  t,
}: {
  briefing: CompanionBriefing;
  t: Translate;
}) {
  const org = briefing.organizationName;
  const narrative =
    briefing.fatherCount === 0
      ? t("manager.companion.narrateEmpty", { org })
      : briefing.quietCount === 0
        ? t("manager.companion.narrateClear", {
            org,
            fathers: briefing.fatherCount,
            startedPct: briefing.startedPct,
            certs: briefing.certificatesReady,
          })
        : t("manager.companion.narrate", {
            org,
            fathers: briefing.fatherCount,
            startedPct: briefing.startedPct,
            quiet: briefing.quietCount,
            certs: briefing.certificatesReady,
          });

  const questions = [
    {
      title: t("manager.companion.fundingTitle"),
      body:
        briefing.fatherCount === 0
          ? t("manager.companion.fundingEmpty")
          : t("manager.companion.fundingBody", {
              certsIssued: briefing.certificatesIssued,
              startedPct: briefing.startedPct,
            }),
    },
    {
      title: t("manager.companion.savingsTitle"),
      body:
        briefing.quietCount === 0
          ? t("manager.companion.savingsClear")
          : t("manager.companion.savingsBody", { quiet: briefing.quietCount }),
    },
    {
      title: t("manager.companion.timeTitle"),
      body:
        briefing.quietCount === 0 && briefing.certificatesReady === 0
          ? t("manager.companion.timeClear")
          : t("manager.companion.timeBody"),
    },
    {
      title: t("manager.companion.extraTitle"),
      body: t("manager.companion.extraBody"),
    },
  ];

  return (
    <CompanionFrame title={t("manager.companion.title")} lead={t("manager.companion.lead")}>
      <p className="text-sm leading-relaxed text-foreground">{narrative}</p>

      <div>
        <h3 className="text-sm font-medium">{t("manager.companion.questionsTitle")}</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {questions.map((question) => (
            <li key={question.title} className="rounded-lg border border-border bg-black/30 p-4">
              <p className="font-medium">{question.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{question.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href="/manager/participants"
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          {t("manager.companion.viewQuiet")}
        </Link>
        <Link href="/manager/impact" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          {t("manager.companion.viewImpact")}
        </Link>
        {briefing.readyCertificates[0] ? (
          <Link
            href={`/manager/participants/${briefing.readyCertificates[0].fatherId}`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            {t("manager.companion.issueCerts")}
          </Link>
        ) : null}
      </div>

      {briefing.quiet.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium">{t("manager.companion.attentionTitle")}</h3>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {briefing.quiet.map((item) => (
              <li key={item.fatherId} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                    {initials(item.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/manager/participants/${item.fatherId}#nudge`}
                      className={cn("block truncate font-medium", interactiveLinkClassName)}
                    >
                      {item.name}
                    </Link>
                    <div className="mt-2">
                      <CompanionNudgeSuggest
                        fatherId={item.fatherId}
                        template={item.template}
                        reason={item.reason}
                        whyTemplate={item.whyTemplate}
                        canNudge={item.canNudge}
                        block={item.block}
                        cooldownDays={item.cooldownDays}
                        returnTo="dashboard"
                        compact
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("manager.companion.noNext")}</p>
      )}
    </CompanionFrame>
  );
}
