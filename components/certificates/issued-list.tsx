import Link from "next/link";

import { CertificateDownloadLink } from "@/components/certificates/download-link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  certificatePreviewPath,
  formatCertificateDate,
  type IssuedCertificate,
} from "@/lib/certificates/types";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function IssuedCertificateList({
  certificates,
  empty,
  emptyTitle,
  actionHref,
  actionLabel,
}: {
  certificates: IssuedCertificate[];
  empty: string;
  emptyTitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const { t } = await getI18n();
  if (certificates.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? t("account.certificatesEmptyTitle")}
        actionHref={actionHref}
        actionLabel={actionLabel}
      >
        {empty}
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-3">
      {certificates.map((certificate) => (
        <li
          key={certificate.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <p className="font-heading font-semibold">{certificate.trainingTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("account.completedOn", { date: formatCertificateDate(certificate.issuedAt) })}
              {certificate.issuerName
                ? ` · ${t("account.issuedBy", { name: certificate.issuerName })}`
                : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {certificate.serialNumber}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href={certificatePreviewPath(certificate.id)}
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full sm:w-auto")}
            >
              {t("common.preview")}
            </Link>
            <CertificateDownloadLink
              certificateId={certificate.id}
              variant="outline"
              className="w-full sm:w-auto"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
