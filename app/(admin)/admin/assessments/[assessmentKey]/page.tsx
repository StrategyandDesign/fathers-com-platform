import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentAuthoringForm } from "@/components/admin/assessment-authoring-form";
import {
  releaseAssessment,
  unreleaseAssessment,
} from "@/lib/admin/assessment-actions";
import { loadAdminAssessmentRelease } from "@/lib/admin/assessment-data";
import { RELEASE_CONFIRM, UNRELEASE_CONFIRM } from "@/lib/admin/assessment-release";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { ReleaseTargetStatusList, ReleaseTargets } from "@/components/admin/release-targets";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  firstPartyAdminPreviewPath,
  isFirstPartyAssessmentKey,
} from "@/lib/assessments/first-party";
import { loadFirstPartyCatalog } from "@/lib/assessments/first-party-data";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { fieldClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminFirstPartyAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentKey: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { assessmentKey } = await params;
  const flash = await searchParams;
  await requireRole("admin");
  if (!isFirstPartyAssessmentKey(assessmentKey)) notFound();
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  if (!assessment) notFound();

  const release = await loadAdminAssessmentRelease(assessmentKey);
  const alreadyReleased = Boolean(release.releasedAt);
  const firstReleased = Boolean(release.firstReleasedAt);

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
          href={firstPartyAdminPreviewPath(assessment.key)}
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          Preview
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {assessment.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {assessment.questionCount} questions. Edit every field, preview the
              father path, then release it to Leaders.
            </p>
          </div>
          <ReleaseStatusBadge
            state={alreadyReleased ? "released" : firstReleased ? "ready" : "catalog"}
          />
        </div>
      </section>

      <AssessmentAuthoringForm
        assessment={assessment}
        invalid={Boolean(flash.error)}
        released={alreadyReleased}
      />

      <section id="release" className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Release to organizations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Leaders cannot see this until you release it. They accept or
              decline for their organization. Fathers do not see it until a
              Leader accepts and shares it.
            </p>
          </div>
          <ReleaseStatusBadge state={alreadyReleased ? "released" : "draft"} />
        </div>

        {alreadyReleased ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-lg border border-input bg-black/30 px-4 py-3">
              <p className="font-medium">Released {formatShortDate(release.releasedAt)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                by {release.releasedByName ?? "Super-admin"}
              </p>
            </div>
            <ReleaseTargetStatusList organizations={release.releaseTargets} />
            <form action={releaseAssessment} className="space-y-4">
              <input type="hidden" name="assessment_key" value={assessment.key} />
              <p className="text-sm text-muted-foreground">
                Send this to more organizations, or again to one that declined.
              </p>
              <ReleaseTargets
                organizations={release.releaseTargets}
                defaultScope="selected"
                noun="assessment"
              />
              <Button type="submit" className="w-full sm:w-auto">
                Release to organizations
              </Button>
            </form>
            <form action={unreleaseAssessment} className="space-y-4">
              <input type="hidden" name="assessment_key" value={assessment.key} />
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
          <form action={releaseAssessment} className="mt-5 space-y-4">
            <input type="hidden" name="assessment_key" value={assessment.key} />
            {firstReleased ? (
              <p className="text-sm text-muted-foreground">
                Release it again to the organizations you choose. Leaders who
                already accepted will not need to accept a second time.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                The first release starts Leader review. Organizations you do
                not include will not see it yet.
              </p>
            )}
            <ReleaseTargets organizations={release.releaseTargets} noun="assessment" />
            {!firstReleased ? (
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">
                  Type <span className="font-medium text-foreground">{RELEASE_CONFIRM}</span> to
                  start Leader review
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
            <Button type="submit" className="w-full sm:w-auto">
              Release to organizations
            </Button>
          </form>
        )}
      </section>

      <Link href="/admin/assessments" className={cn(buttonVariants({ variant: "outline" }))}>
        Back to Assessments
      </Link>
    </div>
  );
}
