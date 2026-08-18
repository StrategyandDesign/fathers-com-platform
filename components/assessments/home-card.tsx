import Link from "next/link";

import { AssessmentPhotoPlate } from "@/components/assessments/photo-plate";
import { Button, buttonVariants } from "@/components/ui/button";
import { startProfile } from "@/lib/father/profile-actions";
import type { ProfileDraft } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, firstUnanswered } from "@/lib/father/questions";
import type { FatherProfileSummary } from "@/lib/father/types";
import { translateThemeLabel } from "@/lib/i18n/flash";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-white/65 uppercase sm:text-xs sm:tracking-[0.18em]";

export async function AssessmentHomeCard({
  profile,
  draft,
  coverSrc,
  neverStarted = false,
  hideActions = false,
  className,
}: {
  profile: FatherProfileSummary | null;
  draft: ProfileDraft | null;
  coverSrc: string;
  neverStarted?: boolean;
  hideActions?: boolean;
  className?: string;
}) {
  const { t, locale } = await getI18n();
  const actionClassName = cn(buttonVariants({ variant: "outline" }), "w-full min-h-11");
  const continueHref = `/father/profile/take?q=${draft ? firstUnanswered(draft.answers) : 1}`;

  return (
    <section className={className} aria-label={t("father.profile.keystone")}>
      <AssessmentPhotoPlate
        src={coverSrc}
        completed={Boolean(profile)}
        className="flex min-h-56 flex-col sm:min-h-64"
      >
        <div className="flex min-h-56 flex-1 flex-col p-4 sm:min-h-64 sm:p-5">
          <p className={eyebrowClassName}>{t("father.profile.keystone")}</p>
          {profile ? (
            <>
              <p className="mt-4 text-sm text-white/65">{t("father.home.primaryDetermination")}</p>
              <p className="font-heading mt-1 text-xl font-semibold tracking-tight text-white uppercase">
                {translateThemeLabel(profile.primary_determination, t)}
              </p>
              <p className="mt-3 text-sm text-white/65">{t("father.home.primaryEdge")}</p>
              <p className="mt-1 font-medium text-white uppercase">
                {translateThemeLabel(profile.primary_edge, t)}
              </p>
              <p className="mt-3 text-sm text-white/65">
                {t("father.home.taken", { date: formatLongDate(profile.taken_at, locale) })}
              </p>
              <div className="mt-auto pt-5">
                <Link href="/father/profile/results" className={actionClassName}>
                  {t("father.profile.viewResults")}
                </Link>
              </div>
            </>
          ) : neverStarted ? (
            <p className="mt-3 text-sm text-white/65">{t("father.home.assessmentLater")}</p>
          ) : draft ? (
            <>
              <h2 className="font-heading mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {t("father.home.inProgress")}
              </h2>
              <p className="mt-1 text-sm text-white/80">
                {t("father.home.questionOf", {
                  n: firstUnanswered(draft.answers),
                  total: PROFILE_QUESTION_COUNT,
                })}
              </p>
              <p className="mt-2 text-sm text-white/65">{t("father.profile.takeHint")}</p>
              {hideActions ? null : (
                <div className="mt-auto pt-5">
                  <Link href={continueHref} className={actionClassName}>
                    {t("father.home.continueProfile")}
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="font-heading mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {t("father.home.takeProfileTitle")}
              </h2>
              <p className="mt-3 text-sm text-white/65">{t("father.home.takeProfileBody")}</p>
              <p className="mt-2 text-sm text-white/65">{t("father.profile.takeHint")}</p>
              {hideActions ? null : (
                <form action={startProfile} className="mt-auto pt-5">
                  <Button type="submit" variant="outline" className="w-full min-h-11">
                    {t("father.home.takeProfile")}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </AssessmentPhotoPlate>
    </section>
  );
}
