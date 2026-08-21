import { HostedFilmPlayer } from "@/components/media/hosted-film-player";

export function TrainingOverviewFilm({
  url,
  title,
  coverSrc,
  language,
  badge,
  notSession,
}: {
  url: string | null | undefined;
  title: string;
  coverSrc?: string | null;
  language?: string;
  badge: string;
  notSession: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-primary/55 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-primary/25 bg-primary/10 px-4 py-3 sm:px-5">
        <p className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
          {badge}
        </p>
        <p className="text-xs text-muted-foreground">{notSession}</p>
      </div>
      <HostedFilmPlayer url={url} title={title} coverSrc={coverSrc} language={language} />
    </section>
  );
}
