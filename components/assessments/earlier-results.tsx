import { AssessmentResultCard } from "@/components/assessments/assessment-result-card";
import { KeystoneCompletedView } from "@/components/profile/keystone-completed-view";
import type { FatherAssessmentResult } from "@/lib/assessments/result-archive";
import type { FatherProfileResult, ProfileDraft } from "@/lib/father/profile";
import { getI18n } from "@/lib/i18n/server";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export async function EarlierAssessmentResults({
  results,
  profile,
  draft,
  canStartKeystone,
}: {
  results: FatherAssessmentResult[];
  profile: FatherProfileResult | null;
  draft: ProfileDraft | null;
  canStartKeystone: boolean;
}) {
  if (results.length === 0) return null;
  const { t } = await getI18n();

  return (
    <section className="space-y-3">
      <p className={eyebrowClassName}>{t("father.assessments.earlierResults")}</p>
      <div className="space-y-3">
        {results.map((result) =>
          result.kind === "keystone" && profile ? (
            <KeystoneCompletedView
              key={result.id}
              profile={profile}
              draft={draft}
              canStartKeystone={canStartKeystone}
              variant="archive"
            />
          ) : (
            <AssessmentResultCard key={result.id} result={result} />
          )
        )}
      </div>
    </section>
  );
}
