import { getI18n } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { removeAssessment, shareAssessment } from "@/lib/assessments/visibility-actions";
import type { AssessmentVisibility } from "@/lib/assessments/availability";

export async function AssessmentVisibilityForms({
  assessmentKey,
  groupId,
  status,
  kind,
  returnTo = "list",
}: {
  assessmentKey: string;
  groupId: string;
  status: AssessmentVisibility;
  kind: "keystone" | "custom";
  returnTo?: "list" | "detail";
}) {
  const { t } = await getI18n();
  if (!groupId) return null;

  if (status === "hidden") {
    return (
      <form action={shareAssessment}>
        <input type="hidden" name="assessment_key" value={assessmentKey} />
        <input type="hidden" name="group_id" value={groupId} />
        <input type="hidden" name="return_to" value={returnTo} />
        <Button type="submit" className="w-full min-h-11 sm:w-auto">
          {t("manager.assessments.share")}
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          {kind === "keystone"
            ? t("manager.assessments.shareKeystoneLead")
            : t("manager.assessments.shareLead")}
        </p>
      </form>
    );
  }

  return (
    <form action={removeAssessment}>
      <input type="hidden" name="assessment_key" value={assessmentKey} />
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <Button type="submit" variant="outline" className="w-full min-h-11 sm:w-auto">
        {t("manager.assessments.removeFromGroup")}
      </Button>
      <p className="mt-2 text-sm text-muted-foreground">
        {kind === "keystone"
          ? t("manager.assessments.removeKeystoneLead")
          : t("manager.assessments.removeCustomLead")}
      </p>
    </form>
  );
}
