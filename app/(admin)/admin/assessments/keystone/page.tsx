import Link from "next/link";

import {
  releaseAssessment,
  unreleaseAssessment,
} from "@/lib/admin/assessment-actions";
import { loadAdminKeystoneRelease } from "@/lib/admin/assessment-data";
import { RELEASE_CONFIRM, UNRELEASE_CONFIRM } from "@/lib/admin/assessment-release";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { ReleaseTargetStatusList, ReleaseTargets } from "@/components/admin/release-targets";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { KEYSTONE_ASSESSMENT_KEY } from "@/lib/assessments/availability";
import { requireRole } from "@/lib/auth/session";
import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import { formatShortDate } from "@/lib/manager/types";
import { fieldClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminKeystonePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const keystone = await loadAdminKeystoneRelease();
  const alreadyReleased = Boolean(keystone.releasedAt);
  const firstReleased = Boolean(keystone.firstReleasedAt);

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/assessments" className={interactiveLinkClassName}>
          Assessments
        </Link>
        <span className="text-foreground/20">|</span>
        <span className="min-w-0">Keystone Assessment</span>
      </p>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Keystone Assessment
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {PROFILE_QUESTION_COUNT} questions. The instrument itself does not
              change. Release shares it with Leaders. They accept, then share it
              with fathers.
            </p>
          </div>
          <ReleaseStatusBadge
            state={alreadyReleased ? "released" : firstReleased ? "ready" : "catalog"}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Release to organizations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Push to every organization or only the ones you select. Leaders
              must accept before they can share it with fathers.
            </p>
          </div>
          <ReleaseStatusBadge state={alreadyReleased ? "released" : "draft"} />
        </div>

        {alreadyReleased ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-lg border border-input bg-inset px-4 py-3">
              <p className="font-medium">Released {formatShortDate(keystone.releasedAt)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                by {keystone.releasedByName ?? "Super-admin"}
              </p>
            </div>
            <ReleaseTargetStatusList organizations={keystone.releaseTargets} />
            <form action={releaseAssessment} className="space-y-4">
              <input type="hidden" name="assessment_key" value={KEYSTONE_ASSESSMENT_KEY} />
              <p className="text-sm text-muted-foreground">
                Send this to more organizations, or again to one that declined.
              </p>
              <ReleaseTargets
                organizations={keystone.releaseTargets}
                defaultScope="selected"
                noun="assessment"
              />
              <Button type="submit" className="w-full sm:w-auto">
                Release to organizations
              </Button>
            </form>
            <form action={unreleaseAssessment} className="space-y-4">
              <input type="hidden" name="assessment_key" value={KEYSTONE_ASSESSMENT_KEY} />
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
            <input type="hidden" name="assessment_key" value={KEYSTONE_ASSESSMENT_KEY} />
            {firstReleased ? (
              <p className="text-sm text-muted-foreground">
                This assessment has left the open catalog. Release it again to
                the organizations you choose. Leaders who already accepted will
                not need to accept a second time.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Until you release Keystone, every organization can already offer
                it. The first release starts Leader review. Organizations you do
                not include lose that open access. Fathers who already started
                keep it.
              </p>
            )}
            <ReleaseTargets organizations={keystone.releaseTargets} noun="assessment" />
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

      <p className="text-sm text-muted-foreground">
        Leaders create their own assessments separately. Those do not come
        through this page.
      </p>
      <Link href="/admin/assessments" className={cn(buttonVariants({ variant: "outline" }))}>
        Back to Assessments
      </Link>
    </div>
  );
}
