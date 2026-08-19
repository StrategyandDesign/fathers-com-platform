import { notFound, redirect } from "next/navigation";

import { SessionCloseoutView } from "@/components/father/session-closeout";
import { Flash } from "@/components/manager/flash";
import { requireRole } from "@/lib/auth/session";
import { actionSkillText } from "@/lib/father/action-commitment";
import { loadSessionContext } from "@/lib/father/data";
import { isOnboardingActive } from "@/lib/father/onboarding";
import { loadOnboardingState } from "@/lib/father/onboarding-data";
import { buildSessionCloseout } from "@/lib/father/session-closeout";
import { parseSkillUse } from "@/lib/father/skill-use";
import { continueHref, isSessionComplete } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";

export default async function SessionDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { sessionId } = await params;
  const { error } = await searchParams;
  const { user } = await requireRole("father");
  const [context, onboarding] = await Promise.all([
    loadSessionContext(user.id, sessionId),
    loadOnboardingState(user.id),
  ]);

  if (!context) {
    notFound();
  }

  if (!isSessionComplete(context.progress)) {
    redirect(continueHref(sessionId, context.progress));
  }

  const { t } = await getI18n();
  const funnel = isOnboardingActive(onboarding.mode, onboarding.step);
  const closeout = buildSessionCloseout({
    finished: context.session,
    sessions: context.trainingSessions,
    progressBySession: context.progressBySession,
    total: context.sessionTotal,
  });

  return (
    <div className="mx-auto max-w-lg space-y-8 lg:space-y-10">
      <p className="text-xs text-muted-foreground">{context.training.title}</p>
      <Flash error={error} />
      <SessionCloseoutView
        closeout={closeout}
        homeHref={funnel ? "/father/start" : `/father?done=${encodeURIComponent(sessionId)}`}
        sessionId={sessionId}
        skill={actionSkillText(context.session, context.session.title)}
        skillUse={parseSkillUse(context.progress?.skill_use)}
        t={t}
      />
    </div>
  );
}
