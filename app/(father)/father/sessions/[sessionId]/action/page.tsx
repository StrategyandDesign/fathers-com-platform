import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SessionHeader } from "@/components/father/session-header";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { completeAction } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { sessionAction } from "@/lib/father/types";
import { interactiveUnderlineClassName, sessionCtaClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

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
    <div className="mx-auto max-w-xl space-y-6 lg:space-y-10">
      <SessionHeader
        training={training}
        session={session}
        current="action"
        backHref={`/father/sessions/${sessionId}`}
      />

      <p className="rounded-xl border border-border bg-card px-4 py-5 text-center text-lg font-semibold leading-snug sm:px-5 sm:py-6 sm:text-xl lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:text-2xl">
        {sessionAction(session)}
      </p>

      <Flash error={error} />

      <form action={completeAction} className="space-y-4">
        <input type="hidden" name="session_id" value={session.id} />
        <div className="flex flex-col gap-3 lg:items-center">
          <Link
            href="/father"
            className={cn(
              buttonVariants({ variant: "inverse", size: "lg" }),
              "w-full min-h-11 max-lg:border-border max-lg:bg-transparent max-lg:text-foreground max-lg:hover:bg-white/5 lg:w-auto"
            )}
          >
            I’ll do this later
          </Link>
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className={sessionCtaClassName}
          >
            {progress?.action_completed
              ? "Action already complete"
              : "I completed this Action"}
          </Button>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Add a quick note (optional)</span>
          <textarea
            className={textareaClassName}
            name="action_note"
            placeholder="e.g., How did it feel?"
            defaultValue={progress?.action_note ?? ""}
          />
        </label>
      </form>

      <p className="text-center">
        <Link
          href={`/father/sessions/${sessionId}`}
          className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
        >
          Back to Session
        </Link>
      </p>
    </div>
  );
}
