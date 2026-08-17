import Link from "next/link";

import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { Flash } from "@/components/manager/flash";
import { DimensionScores } from "@/components/profile/dimension-scores";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { retakeProfile, startProfile } from "@/lib/father/profile-actions";
import { loadProfileState } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { cn } from "@/lib/utils";

export default async function FatherProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("father");
  const { profile, draft } = await loadProfileState(user.id);
  const customAssignments = await loadFatherAssignments(user.id);
  const banner = <Flash error={flash.error} notice={flash.notice} />;

  if (profile) {
    const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);
    return (
      <div className="space-y-6">
        {banner}
        <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            Your Keystone Profile
          </p>
          <p className="mt-6 text-sm text-muted-foreground">Primary Determination</p>
          <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight uppercase sm:text-3xl">
            {profile.primary_determination ?? "Complete"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            Primary Edge: {profile.primary_edge ?? "—"}
          </p>
          {scores ? <DimensionScores scores={scores} /> : null}
          <p className="mt-6 text-sm text-muted-foreground">
            Date of last profile:{" "}
            {new Date(profile.taken_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/father/profile/results" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              View results
            </Link>
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
            Keystone Profile
          </p>
          <p className="mt-4 text-muted-foreground">
            Retake when you want a fresh reading. Your last results stay until a
            new Profile is completed.
          </p>
          {draft ? (
            <Link
              href={`/father/profile/take?q=${firstUnanswered(draft.answers)}`}
              className={cn(buttonVariants(), "mt-8 w-full lg:w-auto")}
            >
              Continue retake
            </Link>
          ) : (
            <form action={retakeProfile} className="mt-8">
              <Button type="submit" className="w-full lg:w-auto">
                Retake Profile
              </Button>
            </form>
          )}
        </section>
        </div>
        <AssignedAssessmentList assignments={customAssignments} />
      </div>
    );
  }

  const answered = draft ? answeredCount(draft.answers) : 0;
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;

  return (
    <div className="space-y-6">
      {banner}
      <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
          Keystone Profile
        </p>
        <p className="mt-4 text-muted-foreground">
          {draft
            ? `Question ${resumeAt} of ${PROFILE_QUESTION_COUNT} · ${answered} answered`
            : "Optional. About twenty minutes, one question at a time."}
        </p>
        {draft ? (
          <Link
            href={`/father/profile/take?q=${resumeAt}`}
            className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full lg:w-auto")}
          >
            Continue
          </Link>
        ) : (
          <form action={startProfile} className="mt-8">
            <Button type="submit" size="lg" className="w-full lg:w-auto">
              Take your Father Profile
            </Button>
          </form>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          128 questions. One at a time. About twenty minutes. You can save and
          come back.
        </p>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
          Your Keystone Profile
        </p>
        <EmptyState
          framed={false}
          className="mt-2 p-0"
          title="No results yet"
        >
          Finish the Profile and your Primary Edge and Determination will show
          up here.
        </EmptyState>
      </section>
      </div>
      <AssignedAssessmentList assignments={customAssignments} />
    </div>
  );
}
