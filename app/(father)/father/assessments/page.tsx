import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { EmptyState } from "@/components/ui/empty-state";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherAssessmentsPage() {
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const assignments = await loadFatherAssignments(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.assessments.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
      </div>
      {assignments.length > 0 ? (
        <AssignedAssessmentList assignments={assignments} hideHeader />
      ) : (
        <EmptyState
          title={t("father.assessments.emptyTitle")}
          actionHref="/father"
          actionLabel={t("father.assessments.backHome")}
        >
          {t("father.assessments.emptyBody")}
        </EmptyState>
      )}
    </div>
  );
}
