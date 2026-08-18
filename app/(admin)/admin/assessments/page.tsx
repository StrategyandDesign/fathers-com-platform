import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { loadAdminKeystoneRelease } from "@/lib/admin/assessment-data";
import { requireRole } from "@/lib/auth/session";
import { PROFILE_QUESTION_COUNT } from "@/lib/father/questions";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const keystone = await loadAdminKeystoneRelease();
  const released = Boolean(keystone.releasedAt);
  const pending = keystone.releaseTargets.filter((row) => row.reviewStatus === "pending").length;
  const accepted = keystone.releaseTargets.filter((row) => row.reviewStatus === "accepted").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Super-admins create and share assessments with organization Leaders.
          Leaders then decide what their fathers can take.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <Link
        href="/admin/assessments/keystone"
        className={cn(
          "block rounded-xl border border-border bg-card p-4 sm:p-6",
          interactiveSurfaceClassName
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold">Keystone Assessment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {PROFILE_QUESTION_COUNT} questions · Platform assessment
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {released
                ? `${accepted} accepted · ${pending} waiting`
                : keystone.firstReleasedAt
                  ? "Un-released. Leaders cannot accept it again until you release it."
                  : "Not in Leader review yet. Every organization can already offer it."}
            </p>
          </div>
          <span className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
            Open
          </span>
        </div>
      </Link>
    </div>
  );
}
