import Link from "next/link";

import {
  CertificateFace,
  certificateFaceLabels,
} from "@/components/certificates/certificate-face";
import { certificatePreviewPath } from "@/lib/certificates/types";
import { shouldCompactHomeDoneShelf } from "@/lib/father/home";
import type { Translate } from "@/lib/i18n/translate";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export type HomeEarnedMark = {
  id: string;
  title: string;
  fatherName?: string;
  completedOn?: string;
  serialNumber?: string;
  issuerName?: string;
};

export function HomeEarnedRow({
  marks,
  t,
  rail = false,
}: {
  marks: HomeEarnedMark[];
  t: Translate;
  rail?: boolean;
}) {
  if (marks.length === 0) return null;
  const labels = certificateFaceLabels(t);
  const compact = shouldCompactHomeDoneShelf(marks.length);

  return (
    <section className="min-w-0 space-y-3.5">
      <p className={eyebrowClassName}>{t("father.home.earned")}</p>
      {compact ? (
        <div className="overflow-hidden rounded-xl border border-border">
          {marks.map((mark) => (
            <Link
              key={mark.id}
              href={certificatePreviewPath(mark.id)}
              className={cn(
                "block min-w-0 border-t border-border px-3.5 py-3 first:border-t-0",
                interactiveSurfaceClassName
              )}
            >
              <p className="line-clamp-2 font-heading text-sm font-semibold leading-snug">
                {mark.title}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className={cn("grid gap-3", rail ? "grid-cols-2 lg:grid-cols-1" : "grid-cols-2")}>
          {marks.map((mark) => (
            <Link
              key={mark.id}
              href={certificatePreviewPath(mark.id)}
              className={cn(
                "min-w-0 overflow-hidden rounded-xl border-x border-b border-border border-t-2 border-t-primary bg-card",
                interactiveSurfaceClassName
              )}
            >
              <CertificateFace
                fatherName={mark.fatherName ?? ""}
                trainingName={mark.title}
                completedOn={mark.completedOn ?? ""}
                serialNumber={mark.serialNumber ?? ""}
                managerName={mark.issuerName ?? ""}
                labels={labels}
                size="snapshot"
              />
              <div className="space-y-0.5 px-3 py-2.5">
                <p className="line-clamp-2 text-xs leading-snug text-foreground">{mark.title}</p>
                <p className="text-[11px] text-muted-foreground">{t("common.preview")}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
