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
import { parseSkillPrompt, sessionAction } from "@/lib/father/session-questions";
import { getI18n } from "@/lib/i18n/server";
import { PRACTICE_ROOT, PRACTICE_WALK } from "@/lib/practice/paths";
import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

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
        backHref={PRACTICE_WALK.checkin(sessionId)}
        trainingHref={PRACTICE_ROOT}
        filmHref={PRACTICE_WALK.session(session.id)}
        checkinHref={PRACTICE_WALK.checkin(session.id)}
        actionHref={PRACTICE_WALK.action(session.id)}
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
          {state === "commit" ? (
            <p className="text-center">
              <Link
                href={PRACTICE_ROOT}
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
              href={`${PRACTICE_WALK.action(session.id)}?change=1`}
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
