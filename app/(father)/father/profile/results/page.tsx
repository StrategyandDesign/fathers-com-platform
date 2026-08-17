import Link from "next/link";
import { redirect } from "next/navigation";

import { DimensionScores } from "@/components/profile/dimension-scores";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { loadLatestProfile } from "@/lib/father/profile";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { cn } from "@/lib/utils";

export default async function FatherProfileResultsPage() {
  const { user } = await requireRole("father");
  const profile = await loadLatestProfile(user.id);

  if (!profile) {
    redirect("/father/profile");
  }

  const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);

  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className="text-sm font-medium text-primary">
          Your Father Profile is complete
        </p>
        <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">
          Primary Determination: {profile.primary_determination ?? "—"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Primary Edge: {profile.primary_edge ?? "—"}
        </p>
        {scores ? <DimensionScores scores={scores} /> : null}
        <p className="mt-8 text-sm text-muted-foreground">
          Completed{" "}
          {new Date(profile.taken_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          As you continue to grow your skills, come back to see how your profile
          evolves.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/father" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Go to Home
          </Link>
          <Link
            href="/father/profile"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
          >
            Profile home
          </Link>
        </div>
      </section>
    </div>
  );
}
