import { AdminDeskList, AdminDeskRow } from "@/components/admin/desk-list";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { Flash } from "@/components/manager/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAdminAssessmentDesk } from "@/lib/admin/assessment-data";
import { requireRole } from "@/lib/auth/session";

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const assessments = await loadAdminAssessmentDesk();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You create and share assessments with organization Leaders. Leaders
            then decide what their fathers can take. Finish the instrument, mark
            Ready, then Release.
          </p>
        </div>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <AdminDeskList
        countHeader="Questions"
        actionHeader="Release"
        empty={
          assessments.length === 0 ? (
            <EmptyState
              framed={false}
              title="No assessments yet"
              actionHref="/admin/assessments"
              actionLabel="Back to Assessments"
            >
              Platform assessments will appear here. Release one when you want
              Leaders to review it.
            </EmptyState>
          ) : undefined
        }
      >
        {assessments.map((assessment) => (
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
            <span className="block truncate text-sm text-muted-foreground">
              {assessment.subtitle}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {assessment.editedLabel}
            </span>
            {assessment.note ? (
              <span className="block text-sm text-foreground">{assessment.note}</span>
            ) : null}
          </AdminDeskRow>
        ))}
      </AdminDeskList>
    </div>
  );
}
