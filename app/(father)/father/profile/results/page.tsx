import Link from "next/link";
import { redirect } from "next/navigation";

import { DimensionScores } from "@/components/profile/dimension-scores";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { retakeProfile } from "@/lib/father/profile-actions";
import { loadLatestProfile } from "@/lib/father/profile";
import { translateThemeLabel } from "@/lib/i18n/flash";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { cn } from "@/lib/utils";

export default async function FatherProfileResultsPage() {
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const profile = await loadLatestProfile(user.id);

  if (!profile) {
    redirect("/father/profile");
  }

  const scores = readStoredDimensionScores(profile.raw_scores, profile.full_results);

  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
        <p className="text-sm font-medium text-primary">
          {t("father.profile.resultsComplete")}
        </p>
        <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight lg:text-3xl">
          {t("father.profile.resultsDetermination", {
            value: translateThemeLabel(profile.primary_determination, t),
          })}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("father.profile.resultsEdge", {
            value: translateThemeLabel(profile.primary_edge, t),
          })}
        </p>
        {scores ? <DimensionScores scores={scores} /> : null}
        <p className="mt-8 text-sm text-muted-foreground">
          {t("father.profile.resultsCompleted", {
            date: formatLongDate(profile.taken_at, locale),
          })}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          {t("father.profile.resultsRetakeLead")}
        </p>
        <div className="mt-8 space-y-4">
          <Link href="/father" className={cn(buttonVariants({ size: "lg" }), "w-full min-h-12")}>
            {t("father.profile.goHome")}
          </Link>
          <form action={retakeProfile} className="text-center">
            <Button type="submit" variant="ghost" className="text-sm text-muted-foreground">
              {t("father.profile.retake")}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
