import { AdminCatalogDesk } from "@/components/admin/catalog-desk";
import { AdminDeskList, AdminDeskRow } from "@/components/admin/desk-list";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminAssessmentDesk } from "@/lib/admin/assessment-data";
import { formatEditedAt } from "@/lib/admin/development";
import { requireRole } from "@/lib/auth/session";

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; view?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const assessments = await loadAdminAssessmentDesk();
  const archivedView = flash.view === "archived";
  const visible = assessments.filter((assessment) =>
    archivedView ? assessment.archived : !assessment.archived
  );

  return (
    <AdminCatalogDesk
      title="Assessments"
      lead="You create and share assessments with organization Leaders. Leaders then decide what their fathers can take. Finish the instrument, mark Ready, then Release."
      error={flash.error}
      notice={flash.notice}
      archivedView={archivedView}
      activeHref="/admin/assessments"
      archivedHref="/admin/assessments?view=archived"
    >
      <AdminDeskList
        countHeader="Questions"
        actionHeader="Release"
        empty={
          visible.length === 0 ? (
            <EmptyState
              framed={false}
              title={archivedView ? "No archived assessments" : "No assessments yet"}
              actionHref="/admin/assessments"
              actionLabel="Back to active"
            >
              {archivedView
                ? "Archive an unfinished instrument from its desk. Recover it anytime."
                : "Platform assessments appear here. Release one when you want Leaders to review it."}
            </EmptyState>
          ) : undefined
        }
      >
        {visible.map((assessment) => (
          <AdminDeskRow
            key={assessment.key}
            href={assessment.href}
            title={assessment.title}
            count={assessment.questionCount}
            countLabel="Questions"
            development={<DevelopmentStatusBadge status={assessment.developmentStatus} />}
            release={<ReleaseStatusBadge state={assessment.releaseState} />}
            actionHref={assessment.actionHref}
            actionLabel={assessment.actionLabel}
          >
            {assessment.kindLabel ? (
              <span className="block truncate text-sm text-muted-foreground">
                {assessment.kindLabel}
              </span>
            ) : null}
            <span className="block truncate text-sm text-muted-foreground">
              {`${assessment.questionCount} question${assessment.questionCount === 1 ? "" : "s"}`}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              Edited {formatEditedAt(assessment.editedAt)}
            </span>
          </AdminDeskRow>
        ))}
      </AdminDeskList>
    </AdminCatalogDesk>
  );
}
