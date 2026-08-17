import { notFound } from "next/navigation";

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
import { markFilmWatched } from "@/lib/father/actions";
import { loadSessionContext } from "@/lib/father/data";
import { youtubeEmbedUrl } from "@/lib/father/types";

export default async function SessionViewerPage({
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

  const { session, training, progress } = context;
  const embed = youtubeEmbedUrl(session.video_url);
  const filmDone = progress?.film_completed ?? false;

  return (
    <div className="space-y-6">
      <SessionHeader
        training={training}
        session={session}
        progress={progress}
        current="film"
      />

      <Card>
        <CardHeader>
          <CardTitle>Film</CardTitle>
          <CardDescription>
            Watch the session, then mark it as watched to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {embed ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
              <iframe
                className="h-full w-full"
                src={embed}
                title={session.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No video is available for this session yet.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <form action={markFilmWatched}>
            <input type="hidden" name="session_id" value={session.id} />
            <Button type="submit">
              {filmDone ? "Continue to Check-in" : "I watched this"}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
