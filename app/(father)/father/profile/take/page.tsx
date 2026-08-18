import { redirect } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { ProfileAnswerOptions } from "@/components/profile/answer-options";
import { ProfileSaveExitButton } from "@/components/profile/save-exit-button";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { loadFatherAssessmentAccess } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { saveAndExitProfile, saveProfileProgress } from "@/lib/father/profile-actions";
import { ensureProfileDraft, loadLatestProfile, loadProfileDraft } from "@/lib/father/profile";
import {
  PROFILE_QUESTION_COUNT,
  PROFILE_SCALE,
  PROFILE_SECTION_COUNT,
  getProfileQuestion,
  isProfileSectionStart,
  profileProgressMilestone,
  profileSectionForQuestion,
  profileSectionPosition,
} from "@/lib/father/questions";
import { translateProfileScale } from "@/lib/i18n/flash";
import { getI18n } from "@/lib/i18n/server";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export default async function FatherProfileTakePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [completed, existingDraft, access] = await Promise.all([
    loadLatestProfile(user.id),
    loadProfileDraft(user.id),
    loadFatherAssessmentAccess(user.id),
  ]);

  if (completed && !existingDraft) {
    redirect("/father/profile/results");
  }
  if (!existingDraft && !access.canStartKeystone) {
    redirect("/father/assessments?error=flash.keystoneUnavailable");
  }

  const draft = existingDraft ?? (await ensureProfileDraft(user.id));
  const requested = Number(params.q ?? draft.current_index);
  const questionId = Number.isInteger(requested)
    ? Math.min(PROFILE_QUESTION_COUNT, Math.max(1, requested))
    : draft.current_index;
  const question = getProfileQuestion(questionId);

  if (!question) {
    redirect("/father/profile");
  }

  const saved = draft.answers[String(question.id)];
  const isLast = question.id === PROFILE_QUESTION_COUNT;
  const section = profileSectionForQuestion(question.id);
  const sectionPosition = profileSectionPosition(question.id, section);
  const sectionPercent = Math.round((sectionPosition / section.size) * 100);
  const overallPercent = Math.round((question.id / PROFILE_QUESTION_COUNT) * 100);
  const sectionStart = isProfileSectionStart(question.id, section);
  const sectionName =
    section.index === 1
      ? t("father.profile.sectionName1")
      : section.index === 2
        ? t("father.profile.sectionName2")
        : section.index === 3
          ? t("father.profile.sectionName3")
          : t("father.profile.sectionName4");
  const sectionLead =
    section.index === 1
      ? t("father.profile.section1Lead")
      : section.index === 2
        ? t("father.profile.section2Lead")
        : section.index === 3
          ? t("father.profile.section3Lead")
          : t("father.profile.section4Lead");
  const milestone = profileProgressMilestone(question.id);
  const milestoneText =
    milestone === "quarter"
      ? t("father.profile.markerQuarter")
      : milestone === "half"
        ? t("father.profile.markerHalf")
        : milestone === "threeQuarters"
          ? t("father.profile.markerThreeQuarters")
          : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <p className={eyebrowClassName}>
          {t("father.profile.sectionOf", { n: section.index, total: PROFILE_SECTION_COUNT })}
          {" · "}
          {sectionName}
        </p>
        {sectionStart ? (
          <div className="space-y-2">
            <p className="text-sm leading-6 text-muted-foreground">{sectionLead}</p>
            {section.index === 1 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {t("father.profile.howToAnswer")}
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="text-sm text-foreground">
          {t("father.profile.sectionProgress", { n: sectionPosition, size: section.size })}
          <span className="text-muted-foreground">
            {" · "}
            {t("father.home.questionOf", { n: question.id, total: PROFILE_QUESTION_COUNT })}
          </span>
        </p>
        <div className="space-y-1.5">
          <ProgressBar
            value={sectionPercent}
            label={t("father.profile.sectionOf", {
              n: section.index,
              total: PROFILE_SECTION_COUNT,
            })}
          />
          <ProgressBar
            value={overallPercent}
            className="h-1 bg-white/[0.06]"
            indicatorClassName="bg-primary/45"
            label={t("father.home.questionOf", {
              n: question.id,
              total: PROFILE_QUESTION_COUNT,
            })}
          />
        </div>
        {milestoneText ? (
          <p role="status" className="text-sm leading-6 text-muted-foreground">
            {milestoneText}
          </p>
        ) : null}
      </div>

      <form
        key={question.id}
        action={isLast ? "/api/profile/evaluate" : saveProfileProgress}
        method="post"
        className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6"
      >
        <h1 className="font-heading text-lg font-semibold leading-snug sm:text-xl lg:text-2xl">
          {question.text}
        </h1>
        <ProfileAnswerOptions
          options={PROFILE_SCALE.map((option) => ({
            ...option,
            label: translateProfileScale(option.value, t),
          }))}
          saved={saved}
          autoAdvance={!isLast}
          invalid={Boolean(params.error)}
        />
        <input type="hidden" name="question_id" value={question.id} />
        {params.error ? (
          <div className="mt-4">
            <Flash error={params.error} />
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 lg:mt-10 lg:items-center">
          {isLast ? (
            <button
              type="submit"
              className={cn(buttonVariants({ size: "lg" }), "w-full min-h-12 lg:w-auto")}
            >
              {t("father.profile.seeResults")}
            </button>
          ) : (
            <button
              type="submit"
              name="intent"
              value="next"
              data-profile-advance
              className="sr-only"
            >
              {t("common.next")}
            </button>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {question.id > 1 ? (
              <button
                type="submit"
                name="intent"
                value="back"
                formNoValidate
                formAction={saveProfileProgress}
                className={cn(
                  "inline-flex min-h-11 items-center text-sm text-muted-foreground",
                  interactiveLinkClassName
                )}
              >
                {t("common.back")}
              </button>
            ) : null}
            <ProfileSaveExitButton action={saveAndExitProfile} />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLast
            ? t("father.profile.chooseThenConfirm")
            : t("father.profile.canStop")}
        </p>
      </form>
    </div>
  );
}
