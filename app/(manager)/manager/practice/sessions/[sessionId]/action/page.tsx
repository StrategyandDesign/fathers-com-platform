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
import { parseSkillPrompt, sessionAction } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { PRACTICE_ROOT, PRACTICE_WALK } from "@/lib/practice/paths";

export default async function LeaderPracticeActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string; change?: string }>;
}) {
  const { sessionId } = await params;
  const { error, change } = await searchParams;
  const { user } = await requireRole("manager");
  const context = await loadSessionContext(user.id, sessionId);

  if (!context) {
    notFound();
  }

  if (!context.unlocked) {
    redirect(PRACTICE_WALK.session(context.redirectSessionId));
  }

  if (!context.progress?.film_completed) {
    redirect(PRACTICE_WALK.session(sessionId));
  }

  if (!context.progress.checkin_completed) {
    redirect(PRACTICE_WALK.checkin(sessionId));
  }

  const commitment = await loadActionCommitment(user.id, sessionId);
  const state = actionLoopState({
    actionCompleted: Boolean(context.progress.action_completed),
    commitment,
  });

  if (state === "closed") {
    redirect(`${PRACTICE_ROOT}?done=${encodeURIComponent(context.session.id)}`);
  }

  const { t, dateLocale } = await getI18n();
  const { session, training, completedCount, sessionTotal } = context;
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
        backHref={PRACTICE_WALK.checkin(sessionId)}
        trainingHref={PRACTICE_ROOT}
        filmHref={PRACTICE_WALK.session(session.id)}
        checkinHref={PRACTICE_WALK.checkin(session.id)}
        actionHref={PRACTICE_WALK.action(session.id)}
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
        skipHref={state === "commit" ? PRACTICE_ROOT : null}
        changeHref={`${PRACTICE_WALK.action(session.id)}?change=1`}
        commitAction={commitActionMoment}
        doneAction={markActionDone}
        finishAction={finishActionSession}
      />
    </div>
  );
}
