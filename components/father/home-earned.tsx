import Link from "next/link";

import { certificateDownloadPath } from "@/lib/certificates/types";
import type { Translate } from "@/lib/i18n/translate";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function HomeEarnedRow({
  marks,
  t,
}: {
  marks: Array<{ id: string; title: string }>;
  t: Translate;
}) {
  if (marks.length === 0) return null;

  return (
    <section className="min-w-0 space-y-3">
      <p className={eyebrowClassName}>{t("father.home.earned")}</p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {marks.map((mark) => (
          <Link
            key={mark.id}
            href={certificateDownloadPath(mark.id)}
            className={cn(
              "w-[8.5rem] shrink-0 rounded-xl border-x border-b border-border border-t-2 border-t-primary bg-card px-3 py-3",
              interactiveSurfaceClassName
            )}
          >
            <p className="line-clamp-3 text-sm leading-snug text-foreground">{mark.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
