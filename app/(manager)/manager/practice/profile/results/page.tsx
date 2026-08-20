import Link from "next/link";
import { redirect } from "next/navigation";

import { KeystoneArrival } from "@/components/profile/keystone-arrival";
import { KeystoneResultCard } from "@/components/profile/keystone-result-card";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { loadProfileHistory } from "@/lib/father/profile";
import { getI18n } from "@/lib/i18n/server";
import { loadLeaderPractice } from "@/lib/practice/data";
import { PRACTICE_ROOT } from "@/lib/practice/paths";
import { suggestKeystoneTraining } from "@/lib/profile/suggest-training";
import { cn } from "@/lib/utils";

export default async function LeaderPracticeProfileResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ arrive?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { t, locale } = await getI18n();
  const [history, practice] = await Promise.all([
    loadProfileHistory(user.id, 2),
    loadLeaderPractice(user.id),
  ]);
  const profile = history[0] ?? null;

  if (!profile) {
    redirect(PRACTICE_ROOT);
  }

  const suggested = suggestKeystoneTraining(
    profile.primary_determination,
    practice.trainingCards.map((card) => card.training)
  );

  return (
    <KeystoneArrival hold={params.arrive === "1"}>
      <div className="mx-auto w-full">
        <KeystoneResultCard
          profile={profile}
          previousTakenAt={history[1]?.taken_at}
          suggestedTraining={suggested}
          trainingHref={suggested ? PRACTICE_ROOT : null}
          showMeanings
          t={t}
          locale={locale}
        />
        <div className="mt-6 print:hidden">
          <Link
            href={PRACTICE_ROOT}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-11 text-sm text-muted-foreground"
            )}
          >
            {t("manager.practice.backToPath")}
          </Link>
        </div>
      </div>
    </KeystoneArrival>
  );
}
