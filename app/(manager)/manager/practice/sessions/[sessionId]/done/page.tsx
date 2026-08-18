import { notFound, redirect } from "next/navigation";

import { SessionCloseoutView } from "@/components/father/session-closeout";
import { requireRole } from "@/lib/auth/session";
import { loadSessionContext } from "@/lib/father/data";
import { buildSessionCloseout } from "@/lib/father/session-closeout";
import { continueHref, isSessionComplete } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { PRACTICE_ROOT, PRACTICE_WALK } from "@/lib/practice/paths";

export default async function LeaderPracticeDonePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
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
      <SessionCloseoutView
        closeout={closeout}
        homeHref={`${PRACTICE_WALK.home}?done=${encodeURIComponent(sessionId)}`}
        t={t}
      />
    </div>
  );
}
