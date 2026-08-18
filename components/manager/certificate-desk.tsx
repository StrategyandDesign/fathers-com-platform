import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { CertificateDeskItem } from "@/lib/manager/certificates-desk";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function CertificateDesk({
  ready,
  issued,
  t,
}: {
  ready: CertificateDeskItem[];
  issued: CertificateDeskItem[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <section
      id="certificates"
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {t("manager.certificates.eyebrow")}
      </p>
      <h2 className="font-heading mt-2 text-lg font-semibold">
        {t("manager.certificates.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("manager.certificates.lead")}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        {ready.length === 1
          ? t("manager.certificates.readyOne")
          : t("manager.certificates.readyMany", { count: ready.length })}
        {" · "}
        {issued.length === 1
          ? t("manager.certificates.issuedOne")
          : t("manager.certificates.issuedMany", { count: issued.length })}
      </p>

      {ready.length === 0 ? (
        <p className="mt-5 rounded-lg border border-border bg-black/30 px-4 py-3 text-sm text-muted-foreground">
          {t("manager.certificates.emptyReady")}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {ready.map((row) => (
            <li key={`${row.fatherId}-${row.trainingId}`}>
              <Link
                href={`/manager/participants/${row.fatherId}/certificates/${row.trainingId}`}
                className={cn(
                  "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                  interactiveSurfaceClassName
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-sm text-muted-foreground">{row.trainingTitle}</p>
                </div>
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "pointer-events-none w-full sm:w-auto"
                  )}
                >
                  {t("manager.participants.previewCertificate")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-sm text-muted-foreground">
        {t("manager.certificates.how")}
      </p>
    </section>
  );
}
