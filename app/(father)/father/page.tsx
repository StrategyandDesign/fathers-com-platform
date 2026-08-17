import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { loadFatherHome } from "@/lib/father/data";
import { startProfile } from "@/lib/father/profile-actions";
import {
  PROFILE_QUESTION_COUNT,
  answeredCount,
  firstUnanswered,
} from "@/lib/father/questions";
import { continueHref } from "@/lib/father/types";

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {completed} of {total} sessions complete
      </p>
    </div>
  );
}

export default async function FatherHomePage() {
  const { user } = await requireRole("father");
  const { trainingCards, next, profile, draft } = await loadFatherHome(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-medium">Home</h1>
        <p className="text-sm text-muted-foreground">
          Film, check-in, then action. A session is done when all three are done.
        </p>
      </div>

      {next ? (
        <Card>
          <CardHeader>
            <Badge variant="secondary">Continue Training</Badge>
            <CardTitle>{next.session.title}</CardTitle>
            <CardDescription>
              {next.training.title} · Session {next.session.session_number}
              {next.session.keyline ? ` — ${next.session.keyline}` : ""}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              href={continueHref(next.session.id, next.progress)}
              className={buttonVariants()}
            >
              Continue
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>You’re caught up</CardTitle>
            <CardDescription>
              Every session in the pilot catalog is complete.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Trainings</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {trainingCards.map(({ training, completed, total, next: trainingNext }) => (
            <Card key={training.id}>
              <CardHeader>
                <CardTitle>{training.title}</CardTitle>
                <CardDescription>{training.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressBar completed={completed} total={total} />
              </CardContent>
              {trainingNext ? (
                <CardFooter>
                  <Link
                    href={`/father/sessions/${trainingNext.id}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Open next session
                  </Link>
                </CardFooter>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Father Profile</CardTitle>
          {profile ? (
            <CardDescription>
              Completed{" "}
              {new Date(profile.taken_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {profile.primary_edge ? ` · ${profile.primary_edge}` : ""}
              {profile.primary_determination
                ? ` · ${profile.primary_determination}`
                : ""}
            </CardDescription>
          ) : draft ? (
            <CardDescription>
              In progress · Question {firstUnanswered(draft.answers)} of{" "}
              {PROFILE_QUESTION_COUNT} · {answeredCount(draft.answers)} answered
            </CardDescription>
          ) : (
            <CardDescription>
              Not started. 128 questions, one at a time. You can save and come
              back.
            </CardDescription>
          )}
        </CardHeader>
        <CardFooter>
          {profile ? (
            <Link href="/father/profile/results" className={buttonVariants()}>
              View results
            </Link>
          ) : draft ? (
            <Link
              href={`/father/profile/take?q=${firstUnanswered(draft.answers)}`}
              className={buttonVariants()}
            >
              Continue Profile
            </Link>
          ) : (
            <form action={startProfile}>
              <Button type="submit">Start Profile</Button>
            </form>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
