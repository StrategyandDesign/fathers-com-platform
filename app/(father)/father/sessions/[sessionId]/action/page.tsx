import { notFound, redirect } from "next/navigation";

import { ActionLoop } from "@/components/father/action-loop";
import { SessionHeader } from "@/components/father/session-header";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import {
  actionLoopState,
  actionSessionEyebrow,
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
    redirect(`/father/sessions/${sessionId}/done`);
  }

  const { t, dateLocale } = await getI18n();
  const { session, training, completedCount, sessionTotal } = context;
  const funnel = isOnboardingActive(onboarding.mode, onboarding.step);
  const skill = actionSkillText(session, parseSkillPrompt(sessionAction(session, training)).stem);
  const timezone = await loadFatherTimeZone(user.id);
  const changing = change === "1" && state === "do";
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
    <div className="mx-auto max-w-lg space-y-8 lg:space-y-10">
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

      <ActionLoop
        sessionId={session.id}
        sessionTitle={actionSessionEyebrow(session, skill)}
        skill={skill}
        state={state}
        changing={changing}
        namedMoment={namedMoment}
        timezone={timezone}
        defaultOption={commitment?.intentionLabel}
        defaultDate={customParts?.date}
        defaultTime={customParts?.time}
        defaultNote={commitment?.outcomeNote}
        skipHref={state === "commit" && !funnel ? "/father" : null}
        changeHref={`/father/sessions/${session.id}/action?change=1`}
        commitAction={commitActionMoment}
        doneAction={markActionDone}
        finishAction={finishActionSession}
      />
    </div>
  );
}
