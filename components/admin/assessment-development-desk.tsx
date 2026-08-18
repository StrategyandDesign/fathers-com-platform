import {
  archivePlatformAssessment,
  recoverPlatformAssessment,
  setPlatformAssessmentStatus,
} from "@/lib/admin/platform-assessment-actions";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import {
  ARCHIVE_CONFIRM,
  asDevelopmentStatus,
  formatEditedAt,
  type AuthoringStatus,
} from "@/lib/admin/development";
import {
  isArchivedAssessment,
  platformAssessmentChecklist,
} from "@/lib/admin/platform-assessments";
import type { PlatformAssessmentDetail } from "@/lib/admin/platform-assessment-data";
import { Button } from "@/components/ui/button";
import { fieldClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function AssessmentDevelopmentDesk({
  assessment,
}: {
  assessment: PlatformAssessmentDetail;
}) {
  const status = asDevelopmentStatus(assessment.development_status);
  const archived = isArchivedAssessment(assessment);
  const checklist = platformAssessmentChecklist({
    title: assessment.title,
    slug: assessment.slug,
    previewed_at: assessment.previewed_at,
    instrument: assessment.instrument,
  });

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Development desk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Author the weighted instrument here. Stage it as a father would see
            it. Only Released assessments enter Leader accept/share.
          </p>
        </div>
        <DevelopmentStatusBadge status={status} />
      </div>

      {assessment.attemptCount > 0 ? (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
          <p className="font-medium">Fathers already have progress on this assessment.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Edits change the instrument they take next. Existing answers stay.
          </p>
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-3">
        <DeskStat label="Last edited" value={formatEditedAt(assessment.last_edited_at)} />
        <DeskStat label="Editor" value={assessment.lastEditedByName ?? "—"} />
        <DeskStat
          label="Stage walk"
          value={assessment.previewed_at ? formatEditedAt(assessment.previewed_at) : "Not yet"}
        />
      </dl>

      <div>
        <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Ready checklist
        </p>
        <ul className="mt-2 space-y-1.5">
          {checklist.items.map((item) => (
            <li key={item.key} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  "mt-0.5 inline-block size-2 shrink-0 rounded-full",
                  item.done ? "bg-primary" : "bg-border"
                )}
              />
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        {checklist.firstMissing ? (
          <p className="mt-3 text-sm text-foreground">{checklist.firstMissing}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Checklist complete. Mark Ready for Review, then publish and release
            when Leaders should see it.
          </p>
        )}
      </div>

      {archived ? (
        <form action={recoverPlatformAssessment} className="space-y-3">
          <input type="hidden" name="assessment_id" value={assessment.id} />
          <p className="text-sm text-muted-foreground">
            Archived ideas stay out of the active catalog and cannot be released
            until you recover them.
          </p>
          <Button type="submit" className="w-full sm:w-auto">
            Recover to In Development
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <form action={setPlatformAssessmentStatus} className="flex flex-wrap gap-2">
            <input type="hidden" name="assessment_id" value={assessment.id} />
            <StatusButton current={status} value="draft" label="Draft" />
            <StatusButton current={status} value="in_development" label="In Development" />
            <StatusButton current={status} value="ready_for_review" label="Ready for Review" />
          </form>
          <form
            action={archivePlatformAssessment}
            className="space-y-3 rounded-lg border border-border bg-black/20 p-3 sm:p-4"
          >
            <input type="hidden" name="assessment_id" value={assessment.id} />
            <p className="text-sm text-muted-foreground">
              Archive keeps the idea. It leaves the active catalog. Live
              progress is not deleted.
            </p>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">
                Type <span className="font-medium text-foreground">{ARCHIVE_CONFIRM}</span> to
                confirm
              </span>
              <input className={fieldClassName} name="confirm" autoComplete="off" required />
            </label>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Archive assessment
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}

function StatusButton({
  current,
  value,
  label,
}: {
  current: string;
  value: AuthoringStatus;
  label: string;
}) {
  return (
    <Button
      type="submit"
      name="development_status"
      value={value}
      variant={current === value ? "default" : "outline"}
      className="w-full sm:w-auto"
    >
      {label}
    </Button>
  );
}

function DeskStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-black/30 px-3 py-3">
      <dt className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
