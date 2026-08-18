import { CoverPhoto } from "@/components/brand/cover";
import { youtubeEmbedUrl, type Session } from "@/lib/father/types";

export function SessionFilmPlayer({
  session,
  coverSrc,
}: {
  session: Pick<Session, "title" | "video_url">;
  coverSrc: string;
}) {
  const embed = youtubeEmbedUrl(session.video_url);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      {embed ? (
        <div className="aspect-video">
          <iframe
            className="h-full w-full"
            src={embed}
            title={session.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="relative aspect-video">
          <CoverPhoto src={coverSrc} />
        </div>
      )}
    </div>
  );
}
