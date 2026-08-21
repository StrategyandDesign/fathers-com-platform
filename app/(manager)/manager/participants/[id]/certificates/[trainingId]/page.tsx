import Link from "next/link";
import { notFound } from "next/navigation";

import { CertificateCard } from "@/components/manager/certificate-card";
import { CertificateDownloadLink } from "@/components/certificates/download-link";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatCertificateDate } from "@/lib/certificates/types";
import { sendCertificate } from "@/lib/manager/actions";
import { loadCertificatePreview } from "@/lib/manager/data";
import { getI18n } from "@/lib/i18n/server";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function ManagerCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; trainingId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id, trainingId } = await params;
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const { t } = await getI18n();
  const preview = await loadCertificatePreview(user.id, id, trainingId);

  if (!preview) {
    notFound();
  }

  const issued = preview.certificate;
  const completedOn = issued
    ? formatCertificateDate(issued.issued_at)
    : formatCertificateDate(new Date().toISOString());

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/participants" className={interactiveLinkClassName}>
          {t("manager.participants.title")}
        </Link>
        <span className="text-foreground/20">|</span>
        <Link href={`/manager/participants/${id}`} className={interactiveLinkClassName}>
          {preview.participant.name}
        </Link>
        <span className="text-foreground/20">|</span>
        {t("manager.cert.title")}
      </p>
      <Flash error={flash.error} notice={flash.notice} />

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("manager.cert.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {issued ? t("manager.cert.issued") : t("manager.cert.preview")}
        </p>
      </div>

      <CertificateCard
        fatherName={preview.participant.name}
        trainingName={preview.training.title}
        completedOn={completedOn}
        serialNumber={issued?.serial_number ?? t("manager.cert.serialPending")}
        managerName={preview.managerName}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {issued ? (
          <CertificateDownloadLink
            certificateId={issued.id}
            size="default"
            className="w-full sm:w-auto"
          >
            {t("common.downloadPdf")}
          </CertificateDownloadLink>
        ) : preview.complete ? (
          <form action={sendCertificate} className="w-full sm:w-auto">
            <input type="hidden" name="father_id" value={id} />
            <input type="hidden" name="training_id" value={trainingId} />
            <Button type="submit" className="w-full sm:w-auto">
              {t("manager.participants.sendCertificate")}
            </Button>
          </form>
        ) : (
          <p className="w-full text-sm text-muted-foreground sm:w-auto">
            {t("manager.cert.notComplete")}
          </p>
        )}
        <Link
          href={`/manager/participants/${id}`}
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          {t("manager.cert.back")}
        </Link>
      </div>
    </div>
  );
}
