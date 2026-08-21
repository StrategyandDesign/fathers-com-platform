import { notFound, redirect } from "next/navigation";

import { SessionCloseoutView } from "@/components/father/session-closeout";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import { actionSkillText } from "@/lib/father/action-commitment";
import { loadSessionContext } from "@/lib/father/data";
import { buildSessionCloseout } from "@/lib/father/session-closeout";
import { formatSkillUseStatement, parseSkillUse } from "@/lib/father/skill-use";
import { continueHref, isSessionComplete } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { PRACTICE_ROOT, PRACTICE_WALK } from "@/lib/practice/paths";

export default async function LeaderPracticeDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { sessionId } = await params;
  const { error } = await searchParams;
  const { user } = await requireRole("manager");
  const context = await loadSessionContext(user.id, sessionId);

  if (!context) {
    notFound();
  }

  if (!isSessionComplete(context.progress)) {
    redirect(continueHref(sessionId, context.progress, { root: PRACTICE_ROOT }));
  }

  const { t } = await getI18n();
  const closeout = buildSessionCloseout({
    finished: context.session,
    sessions: context.trainingSessions,
    progressBySession: context.progressBySession,
    total: context.sessionTotal,
    root: PRACTICE_ROOT,
  });

  return (
    <div className="mx-auto max-w-lg space-y-8 lg:space-y-10">
      <p className="text-xs text-muted-foreground">{context.training.title}</p>
      <Flash error={error} />
      <SessionCloseoutView
        closeout={closeout}
        homeHref={`${PRACTICE_WALK.home}?done=${encodeURIComponent(sessionId)}`}
        sessionId={sessionId}
        skill={formatSkillUseStatement(actionSkillText(context.session, context.session.title))}
        skillUse={parseSkillUse(context.progress?.skill_use)}
        t={t}
      />
    </div>
  );
}
