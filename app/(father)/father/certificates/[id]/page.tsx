import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CertificateFace,
  certificateFaceLabels,
} from "@/components/certificates/certificate-face";
import { CertificateDownloadLink } from "@/components/certificates/download-link";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { loadCertificatePayload } from "@/lib/certificates/data";
import { getI18n } from "@/lib/i18n/server";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherCertificatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("father");
  const { t } = await getI18n();
  const loaded = await loadCertificatePayload(id);

  if (!loaded) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/father" className={interactiveLinkClassName}>
          {t("nav.home")}
        </Link>
        <span className="text-white/20">|</span>
        <Link href="/father/certificates" className={interactiveLinkClassName}>
          {t("account.certificates")}
        </Link>
        <span className="text-white/20">|</span>
        {t("common.preview")}
      </p>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {loaded.payload.trainingName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("account.certificatePreviewLead")}
        </p>
      </div>

      <CertificateFace {...loaded.payload} labels={certificateFaceLabels(t)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <CertificateDownloadLink certificateId={id} size="default" className="w-full sm:w-auto">
          {t("common.downloadPdf")}
        </CertificateDownloadLink>
        <Link
          href="/father/certificates"
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          {t("account.backToCertificates")}
        </Link>
      </div>
    </div>
  );
}
