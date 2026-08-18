import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  ActionCommitmentForm,
  ActionDoneForm,
  ActionFinishForm,
} from "@/components/father/action-commitment-form";
import { ActionSkillCard } from "@/components/father/action-skill-card";
import { SessionHeader } from "@/components/father/session-header";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import {
  actionLoopState,
  actionSkillText,
  customMomentParts,
  formatNamedMoment,
  INTENTION_LABEL_KEYS,
} from "@/lib/father/action-commitment";
import { loadActionCommitment, loadFatherTimeZone } from "@/lib/father/action-commitment-data";
import {
  commitActionMoment,
  finishActionSession,
  markActionDone,
} from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { loadOnboardingState } from "@/lib/father/onboarding-data";
import { isOnboardingActive } from "@/lib/father/onboarding";
import { parseSkillPrompt, sessionAction } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function SessionActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string; change?: string }>;
}) {
  const { sessionId } = await params;
  const { error, change } = await searchParams;
  const { user } = await requireRole("father");
  const [context, onboarding] = await Promise.all([
    loadSessionContext(user.id, sessionId),
    loadOnboardingState(user.id),
  ]);

  if (!context) {
    notFound();
  }

  if (!context.unlocked) {
    redirect(context.gateRedirect ?? `/father/sessions/${context.redirectSessionId}`);
  }

  if (!context.progress?.film_completed) {
    redirect(`/father/sessions/${sessionId}`);
  }

  if (!context.progress.checkin_completed) {
    redirect(`/father/sessions/${sessionId}/checkin`);
  }

  const commitment = await loadActionCommitment(user.id, sessionId);
  const state = actionLoopState({
    actionCompleted: Boolean(context.progress.action_completed),
    commitment,
  });

  if (state === "closed") {
    redirect(`/father?done=${encodeURIComponent(context.session.id)}`);
  }

  const { t, dateLocale } = await getI18n();
  const { session, training, completedCount, sessionTotal } = context;
  const funnel = isOnboardingActive(onboarding.mode, onboarding.step);
  const skill = actionSkillText(session, parseSkillPrompt(sessionAction(session, training)).stem);
  const timezone = await loadFatherTimeZone(user.id);
  const changing = change === "1" && state === "do";
  const showCommit = state === "commit" || changing;
  const customParts =
    commitment?.intentionLabel === "custom" && commitment.intentionAt
      ? customMomentParts(commitment.intentionAt, timezone)
      : null;
  const namedMoment = commitment
    ? formatNamedMoment({
        label: commitment.intentionLabel,
        intentionAt: commitment.intentionAt,
        timeZone: timezone,
        locale: dateLocale,
        optionLabel: t(INTENTION_LABEL_KEYS[commitment.intentionLabel]),
      })
    : "";

  return (
    <div className="mx-auto max-w-xl space-y-5 lg:space-y-8">
      <SessionHeader
        training={training}
        session={session}
        current="action"
        completedCount={completedCount}
        sessionTotal={sessionTotal}
        backHref={`/father/sessions/${sessionId}/checkin`}
        trainingHref={funnel ? null : undefined}
        filmCompleted
        checkinCompleted
      />

      <Flash error={error} />

      <ActionSkillCard skill={skill} />

      {showCommit ? (
        <>
          <ActionCommitmentForm
            sessionId={session.id}
            defaultOption={changing ? commitment?.intentionLabel : null}
            defaultDate={customParts?.date}
            defaultTime={customParts?.time}
            timezone={timezone}
            action={commitActionMoment}
          />
          {state === "commit" && !funnel ? (
            <p className="text-center">
              <Link
                href="/father"
                className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
              >
                {t("father.session.skipForNow")}
              </Link>
            </p>
          ) : null}
        </>
      ) : null}

      {state === "do" && !changing ? (
        <>
          <p className="text-center text-sm text-muted-foreground">{namedMoment}</p>
          <ActionDoneForm sessionId={session.id} action={markActionDone} />
          <p className="text-center">
            <Link
              href={`/father/sessions/${session.id}/action?change=1`}
              className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
            >
              {t("father.session.changeMoment")}
            </Link>
          </p>
        </>
      ) : null}

      {state === "finish" ? (
        <ActionFinishForm
          sessionId={session.id}
          defaultNote={commitment?.outcomeNote}
          action={finishActionSession}
        />
      ) : null}
    </div>
  );
}
