import Link from "next/link";
import { redirect } from "next/navigation";

import { KeystoneArrival } from "@/components/profile/keystone-arrival";
import { KeystoneResultCard } from "@/components/profile/keystone-result-card";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { loadFatherHome } from "@/lib/father/data";
import { loadProfileHistory } from "@/lib/father/profile";
import { getI18n } from "@/lib/i18n/server";
import { suggestKeystoneTraining } from "@/lib/profile/suggest-training";
import { cn } from "@/lib/utils";

export default async function FatherProfileResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ arrive?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const [history, home] = await Promise.all([
    loadProfileHistory(user.id, 2),
    loadFatherHome(user.id),
  ]);
  const profile = history[0] ?? null;

  if (!profile) {
    redirect("/father/assessments");
  }

  const suggested = suggestKeystoneTraining(
    profile.primary_determination,
    home.trainingCards.map((card) => card.training)
  );

  return (
    <KeystoneArrival hold={params.arrive === "1"}>
      <div className="mx-auto w-full">
        <KeystoneResultCard
          profile={profile}
          previousTakenAt={history[1]?.taken_at}
          suggestedTraining={suggested}
          trainingHref={suggested ? `/father/trainings/${suggested.id}` : null}
          showMeanings
          t={t}
          locale={locale}
        />
        <div className="mt-6 print:hidden">
          <Link
            href="/father/assessments"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-11 text-sm text-muted-foreground"
            )}
          >
            {t("father.profile.backToProfile")}
          </Link>
        </div>
      </div>
    </KeystoneArrival>
  );
}
