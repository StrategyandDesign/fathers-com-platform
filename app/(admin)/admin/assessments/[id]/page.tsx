import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentDevelopmentDesk } from "@/components/admin/assessment-development-desk";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { PlatformAssessmentEditor } from "@/components/admin/platform-assessment-editor";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { ReleaseTargetStatusList, ReleaseTargets } from "@/components/admin/release-targets";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { RELEASE_CONFIRM, UNRELEASE_CONFIRM } from "@/lib/admin/assessment-release";
import {
  deletePlatformAssessment,
  releasePlatformAssessment,
  savePlatformInstrument,
  setPlatformAssessmentPublished,
  unreleasePlatformAssessment,
  updatePlatformAssessment,
} from "@/lib/admin/platform-assessment-actions";
import { loadAdminPlatformAssessment } from "@/lib/admin/platform-assessment-data";
import {
  assessmentReleaseState,
  isArchivedAssessment,
} from "@/lib/admin/platform-assessments";
import { asDevelopmentStatus } from "@/lib/admin/development";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminPlatformAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");
  const assessment = await loadAdminPlatformAssessment(id);
  if (!assessment) notFound();

  const archived = isArchivedAssessment(assessment);
  const alreadyReleased = Boolean(assessment.releasedAt);
  const canRelease =
    !archived && assessment.published && assessment.questionCount > 0;
  const developmentStatus = asDevelopmentStatus(assessment.development_status);
  const releaseState = assessmentReleaseState({
    published: assessment.published,
    releasedAt: assessment.releasedAt,
    firstReleasedAt: assessment.firstReleasedAt,
    developmentStatus: assessment.development_status,
  });
  const canDelete = assessment.attemptCount === 0 && !assessment.firstReleasedAt;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/assessments" className={interactiveLinkClassName}>
            Assessments
          </Link>
          <span className="text-white/20">|</span>
          <span className="min-w-0">{assessment.title}</span>
        </p>
        <Link
          href={`/admin/assessments/${assessment.id}/stage`}
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          Open staging
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form
        action={updatePlatformAssessment}
        className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <input type="hidden" name="assessment_id" value={assessment.id} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {assessment.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {`${assessment.questionCount} question${
                assessment.questionCount === 1 ? "" : "s"
              } · Weighted mean`}
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <DevelopmentStatusBadge status={developmentStatus} />
            <ReleaseStatusBadge state={releaseState} />
            <span className="text-sm text-muted-foreground">
              {assessment.published ? "Published" : "Unpublished"}
            </span>
          </div>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input
            className={fieldClassName}
            name="title"
            defaultValue={assessment.title}
            required
            maxLength={120}
            aria-invalid={Boolean(flash.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Hebrew title</span>
          <input
            className={fieldClassName}
            name="title_he"
            defaultValue={assessment.title_he ?? ""}
            maxLength={120}
            dir="rtl"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Slug</span>
          <input
            className={fieldClassName}
            name="slug"
            defaultValue={assessment.slug}
            readOnly={Boolean(assessment.firstReleasedAt)}
          />
          {assessment.firstReleasedAt ? (
            <span className="block text-sm text-muted-foreground">
              Slug is locked after the first release.
            </span>
          ) : null}
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Working title</span>
          <input
            className={fieldClassName}
            name="working_title"
            defaultValue={assessment.working_title ?? ""}
            maxLength={120}
            placeholder="Internal name. Fathers still see Title."
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea
            className={textareaClassName}
            name="description"
            defaultValue={assessment.description ?? ""}
            maxLength={2000}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Hebrew description</span>
          <textarea
            className={textareaClassName}
            name="description_he"
            defaultValue={assessment.description_he ?? ""}
            maxLength={2000}
            dir="rtl"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Development notes</span>
          <textarea
            className={textareaClassName}
            name="development_notes"
            defaultValue={assessment.development_notes ?? ""}
            maxLength={4000}
            placeholder="Super-admin only. Early ideas, gaps, next sitting."
          />
        </label>
        <Button type="submit" className="w-full sm:w-auto">
          Save details
        </Button>
      </form>

      <form
        action={savePlatformInstrument}
        className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <input type="hidden" name="assessment_id" value={assessment.id} />
        <PlatformAssessmentEditor initial={assessment.instrument} />
        <Button type="submit" className="w-full sm:w-auto">
          Save instrument
        </Button>
      </form>

      <AssessmentDevelopmentDesk assessment={assessment} />

      <form
        action={setPlatformAssessmentPublished}
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <input type="hidden" name="assessment_id" value={assessment.id} />
        <input
          type="hidden"
          name="published"
          value={assessment.published ? "false" : "true"}
        />
        <h2 className="font-heading text-lg font-semibold">
          {assessment.published ? "Unpublish" : "Publish"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Publishing does not notify Leaders. Use Release below when the
          assessment is ready for review. Unpublished assessments stay off new
          starts. Fathers who already have progress can still continue.
        </p>
        <Button type="submit" variant="outline" className="mt-4 w-full sm:w-auto">
          {assessment.published ? "Unpublish" : "Publish"}
        </Button>
      </form>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Release to organizations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Push to every organization or only the ones you select. Leaders
              must accept, then share it with fathers.
            </p>
          </div>
          <ReleaseStatusBadge state={alreadyReleased ? "released" : "draft"} />
        </div>

        {alreadyReleased ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-lg border border-input bg-black/30 px-4 py-3">
              <p className="font-medium">
                Released {formatShortDate(assessment.releasedAt)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                by {assessment.releasedByName ?? "Super-admin"}
              </p>
            </div>
            <ReleaseTargetStatusList organizations={assessment.releaseTargets} />
            <form action={releasePlatformAssessment} className="space-y-4">
              <input type="hidden" name="assessment_id" value={assessment.id} />
              <p className="text-sm text-muted-foreground">
                Send this to more organizations, or again to one that declined.
              </p>
              <ReleaseTargets
                organizations={assessment.releaseTargets}
                defaultScope="selected"
                noun="assessment"
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={!canRelease}>
                Release to organizations
              </Button>
            </form>
            <form action={unreleasePlatformAssessment} className="space-y-4">
              <input type="hidden" name="assessment_id" value={assessment.id} />
              <p className="text-sm text-muted-foreground">
                Un-release withdraws pending reviews. Organizations that already
                accepted keep that decision, but fathers cannot start until you
                release it again. Existing progress stays.
              </p>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">
                  Type <span className="font-medium text-foreground">{UNRELEASE_CONFIRM}</span> to
                  confirm
                </span>
                <input
                  className={fieldClassName}
                  name="confirm"
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(flash.error) || undefined}
                />
              </label>
              <Button type="submit" variant="destructive" className="w-full sm:w-auto">
                Un-release
              </Button>
            </form>
          </div>
        ) : (
          <form action={releasePlatformAssessment} className="mt-5 space-y-4">
            <input type="hidden" name="assessment_id" value={assessment.id} />
            {archived ? (
              <p className="text-sm text-muted-foreground">
                Recover this assessment from the archive before releasing it to
                Leaders.
              </p>
            ) : !assessment.published ? (
              <p className="text-sm text-muted-foreground">
                Publish this assessment first. Release is a separate,
                deliberate step. Mark Ready for Review on the development desk
                first.
              </p>
            ) : assessment.questionCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add at least one question before releasing it for review.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Leaders get an in-app notice and can accept or decline. Fathers
                do not see it until a Leader accepts and shares it.
              </p>
            )}
            {canRelease ? (
              <ReleaseTargets organizations={assessment.releaseTargets} noun="assessment" />
            ) : null}
            {assessment.firstReleasedAt ? (
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">
                  Type <span className="font-medium text-foreground">{RELEASE_CONFIRM}</span> to
                  release again
                </span>
                <input
                  className={fieldClassName}
                  name="confirm"
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(flash.error) || undefined}
                />
              </label>
            ) : null}
            <Button type="submit" className="w-full sm:w-auto" disabled={!canRelease}>
              Release to organizations
            </Button>
          </form>
        )}
      </section>

      {canDelete ? (
        <form
          action={deletePlatformAssessment}
          className="rounded-xl border border-border bg-card p-4 sm:p-6"
        >
          <input type="hidden" name="assessment_id" value={assessment.id} />
          <h2 className="font-heading text-lg font-semibold">Delete draft</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only unused drafts can be deleted. After a release or a father
            start, archive instead.
          </p>
          <Button type="submit" variant="destructive" className="mt-4 w-full sm:w-auto">
            Delete assessment
          </Button>
        </form>
      ) : null}
    </div>
  );
}
