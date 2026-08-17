import { CertificateDownloadLink } from "@/components/certificates/download-link";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCertificateDate, type IssuedCertificate } from "@/lib/certificates/types";

export function IssuedCertificateList({
  certificates,
  empty,
  emptyTitle = "No certificates yet",
  actionHref,
  actionLabel,
}: {
  certificates: IssuedCertificate[];
  empty: string;
  emptyTitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  if (certificates.length === 0) {
    return (
      <EmptyState title={emptyTitle} actionHref={actionHref} actionLabel={actionLabel}>
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
              Completed {formatCertificateDate(certificate.issuedAt)}
              {certificate.issuerName ? ` · Issued by ${certificate.issuerName}` : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {certificate.serialNumber}
            </p>
          </div>
          <CertificateDownloadLink certificateId={certificate.id} className="w-full sm:w-auto" />
        </li>
      ))}
    </ul>
  );
}
