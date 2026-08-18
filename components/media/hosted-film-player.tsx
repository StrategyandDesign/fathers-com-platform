import { CoverPhoto } from "@/components/brand/cover";
import { hostedVideoEmbed } from "@/lib/media/hosted-video";

export function HostedFilmPlayer({
  url,
  title,
  coverSrc,
  language,
}: {
  url: string | null | undefined;
  title: string;
  coverSrc?: string | null;
  language?: string;
}) {
  const embed = hostedVideoEmbed(url, { language });

  return (
    <div className="overflow-hidden bg-black">
      {embed ? (
        <div className="aspect-video">
          <iframe
            className="h-full w-full"
            src={embed}
            title={title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
