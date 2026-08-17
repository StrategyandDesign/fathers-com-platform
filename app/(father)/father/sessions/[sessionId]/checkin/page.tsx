import { notFound, redirect } from "next/navigation";

import { SessionHeader } from "@/components/father/session-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { submitCheckin } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { CHECKIN_QUESTIONS } from "@/lib/father/types";

const fieldClassName =
  "min-h-24 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function SessionCheckinPage({
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

  const { session, training, progress } = context;

  return (
    <div className="space-y-6">
      <SessionHeader
        training={training}
        session={session}
        progress={progress}
        current="checkin"
      />

      <Card>
        <CardHeader>
          <CardTitle>Check-in</CardTitle>
          <CardDescription>
            Three short questions. A session is not complete until these are in.
          </CardDescription>
        </CardHeader>
        <form action={submitCheckin}>
          <CardContent className="space-y-4">
            <input type="hidden" name="session_id" value={session.id} />
            {CHECKIN_QUESTIONS.map((question) => (
              <label key={question.key} className="block space-y-1.5">
                <span className="text-sm font-medium">{question.label}</span>
                <textarea
                  className={fieldClassName}
                  name={question.key}
                  required
                  defaultValue={progress?.checkin_answers?.[question.key] ?? ""}
                />
              </label>
            ))}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
          <CardFooter>
            <Button type="submit">
              {progress?.checkin_completed
                ? "Save and continue"
                : "Mark check-in complete"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
