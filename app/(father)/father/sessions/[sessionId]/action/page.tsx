import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionHeader } from "@/components/father/session-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { completeAction } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { sessionAction } from "@/lib/father/types";

export default async function SessionActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { sessionId } = await params;
  const { error } = await searchParams;
  const { user } = await requireRole("father");
  const context = await loadSessionContext(user.id, sessionId);

  if (!context) {
    notFound();
  }

  if (!context.progress?.film_completed) {
    redirect(`/father/sessions/${sessionId}`);
  }

  if (!context.progress.checkin_completed) {
    redirect(`/father/sessions/${sessionId}/checkin`);
  }

  const { session, training, progress } = context;

  return (
    <div className="space-y-6">
      <SessionHeader
        training={training}
        session={session}
        progress={progress}
        current="action"
      />

      <Card>
        <CardHeader>
          <CardTitle>Action</CardTitle>
          <CardDescription>
            Do this after the film and check-in. The session is complete when you
            mark it done.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-base">{sessionAction(session)}</p>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Link href="/father" className={buttonVariants({ variant: "outline" })}>
            I’ll do this later
          </Link>
          <form action={completeAction}>
            <input type="hidden" name="session_id" value={session.id} />
            <Button type="submit">
              {progress?.action_completed
                ? "Action already complete"
                : "I completed this Action"}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
