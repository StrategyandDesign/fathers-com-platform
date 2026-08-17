import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { startProfile } from "@/lib/father/profile-actions";
import { loadProfileState } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";

export default async function FatherProfilePage() {
  const { user } = await requireRole("father");
  const { profile, draft } = await loadProfileState(user.id);

  if (profile) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/father" className="hover:underline">
              Home
            </Link>
            <span className="px-1.5">/</span>
            Father Profile
          </p>
          <h1 className="font-heading mt-2 text-2xl font-medium">Father Profile</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>
              {profile.primary_edge ? `Primary Edge: ${profile.primary_edge}` : "Results are ready."}
              {profile.primary_determination
                ? ` · Determination: ${profile.primary_determination}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/father/profile/results" className={buttonVariants()}>
              View results
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const answered = draft ? answeredCount(draft.answers) : 0;
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/father" className="hover:underline">
            Home
          </Link>
          <span className="px-1.5">/</span>
          Father Profile
        </p>
        <h1 className="font-heading mt-2 text-2xl font-medium">Father Profile</h1>
        <p className="text-sm text-muted-foreground">
          128 questions. One at a time. You can save and come back.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{draft ? "Continue your Profile" : "Start your Profile"}</CardTitle>
          <CardDescription>
            {draft
              ? `Question ${resumeAt} of ${PROFILE_QUESTION_COUNT} · ${answered} answered`
              : "About twenty minutes. Your answers stay on the server so you can resume."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          {draft ? (
            <Link
              href={`/father/profile/take?q=${resumeAt}`}
              className={buttonVariants()}
            >
              Continue
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
