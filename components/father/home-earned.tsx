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
  rail = false,
}: {
  marks: Array<{ id: string; title: string }>;
  t: Translate;
  rail?: boolean;
}) {
  if (marks.length === 0) return null;

  return (
    <section className="min-w-0 space-y-3.5">
      <p className={eyebrowClassName}>{t("father.home.earned")}</p>
      <div className={cn("grid gap-3", rail ? "grid-cols-2 lg:grid-cols-1" : "grid-cols-2")}>
        {marks.map((mark) => (
          <Link
            key={mark.id}
            href={certificateDownloadPath(mark.id)}
            className={cn(
              "min-h-[5.5rem] rounded-xl border-x border-b border-border border-t-2 border-t-primary bg-card px-3.5 py-3.5",
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
