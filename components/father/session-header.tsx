import Link from "next/link";

import { SessionSteps } from "@/components/father/session-steps";
import type { Session, SessionProgress, Training } from "@/lib/father/types";

export function SessionHeader({
  training,
  session,
  progress,
  current,
}: {
  training: Training;
  session: Session;
  progress: SessionProgress | null;
  current: "film" | "checkin" | "action";
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/father" className="hover:underline">
          Home
        </Link>
        <span className="px-1.5">/</span>
        {training.title}
        <span className="px-1.5">/</span>
        Session {session.session_number}
      </p>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-medium">{session.title}</h1>
        {session.keyline ? (
          <p className="text-muted-foreground">{session.keyline}</p>
        ) : null}
      </div>
      <SessionSteps
        sessionId={session.id}
        current={current}
        filmCompleted={progress?.film_completed ?? false}
        checkinCompleted={progress?.checkin_completed ?? false}
        actionCompleted={progress?.action_completed ?? false}
      />
    </div>
  );
}
