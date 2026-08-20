import { Flash } from "@/components/manager/flash";
import { KeystoneLikert } from "@/components/profile/keystone-likert";
import { ProfileSaveExitButton } from "@/components/profile/save-exit-button";
import { ProgressBar } from "@/components/ui/progress";
import { saveAndExitProfile, saveProfileProgress } from "@/lib/father/profile-actions";
import {
  PROFILE_QUESTION_COUNT,
  PROFILE_SCALE,
  PROFILE_SECTION_COUNT,
  isProfileSectionStart,
  profileSectionForQuestion,
  profileSectionPosition,
  type ProfileQuestion,
} from "@/lib/father/questions";
import { translateProfileScale } from "@/lib/i18n/flash";
import type { Translate } from "@/lib/i18n/translate";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function sectionCopy(index: number, t: Translate) {
  if (index === 1) {
    return { name: t("father.profile.sectionName1"), lead: t("father.profile.section1Lead") };
  }
  if (index === 2) {
    return { name: t("father.profile.sectionName2"), lead: t("father.profile.section2Lead") };
  }
  if (index === 3) {
    return { name: t("father.profile.sectionName3"), lead: t("father.profile.section3Lead") };
  }
  return { name: t("father.profile.sectionName4"), lead: t("father.profile.section4Lead") };
}

export function KeystonePlayer({
  question,
  saved,
  error,
  t,
}: {
  question: ProfileQuestion;
  saved?: number;
  error?: string;
  t: Translate;
}) {
  const isLast = question.id === PROFILE_QUESTION_COUNT;
  const section = profileSectionForQuestion(question.id);
  const sectionPosition = profileSectionPosition(question.id, section);
  const sectionPercent = (sectionPosition / section.size) * 100;
  const sectionStart = isProfileSectionStart(question.id, section);
  const copy = sectionCopy(section.index, t);
  const partLabel = t("father.profile.sectionOf", {
    n: section.index,
    total: PROFILE_SECTION_COUNT,
  });

  return (
    <form
      key={question.id}
      action={isLast ? "/api/profile/evaluate" : saveProfileProgress}
      method="post"
      className="flex min-h-[min(34rem,calc(100svh-3rem))] flex-col rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      {sectionStart ? (
        <div className="mb-4 space-y-2">
          <p className="text-sm leading-6 text-muted-foreground">{copy.lead}</p>
          {section.index === 1 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {t("father.profile.howToAnswer")}
            </p>
          ) : null}
        </div>
      ) : null}

      <h1 className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
        {question.text}
      </h1>

      <KeystoneLikert
        options={PROFILE_SCALE.map((option) => ({
          ...option,
          label: translateProfileScale(option.value, t),
        }))}
        saved={saved}
        autoAdvance
        invalid={Boolean(error)}
      />
      <input type="hidden" name="question_id" value={question.id} />
      {error ? (
        <div className="mt-4">
          <Flash error={error} />
        </div>
      ) : null}

      {isLast ? (
        <button type="submit" data-profile-advance className="sr-only">
          {t("common.submit")}
        </button>
      ) : (
        <button type="submit" name="intent" value="next" data-profile-advance className="sr-only">
          {t("common.next")}
        </button>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
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

      <p className="mt-6 text-center text-sm text-muted-foreground">{t("father.profile.canStop")}</p>

      <div className="mt-auto pt-8">
        <p className="mb-2 text-center text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {partLabel}
        </p>
        <ProgressBar
          value={sectionPercent}
          label={partLabel}
          className="motion-reduce:[&>div]:transition-none"
        />
      </div>
    </form>
  );
}
