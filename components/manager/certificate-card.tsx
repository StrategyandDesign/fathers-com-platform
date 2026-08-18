import { getI18n } from "@/lib/i18n/server";
import type { CertificatePayload } from "@/lib/certificates/types";

export async function CertificateCard({
  fatherName,
  trainingName,
  completedOn,
  serialNumber,
  managerName,
}: CertificatePayload) {
  const { t } = await getI18n();
  return (
    <article className="rounded-xl border-4 border-primary bg-white px-4 py-6 text-[#141210] sm:border-[6px] sm:px-10 sm:py-12">
      <p className="text-center text-[10px] font-semibold tracking-[0.2em] text-[#326638] uppercase sm:text-[11px] sm:tracking-[0.32em]">
        Fathers.com
      </p>
      <p className="mt-4 text-center text-[11px] tracking-[0.08em] text-[#5c5648] uppercase sm:mt-5 sm:text-xs sm:tracking-[0.22em]">
        {t("manager.cert.ofCompletion")}
      </p>
      <h2 className="font-heading mt-6 text-center text-2xl font-semibold tracking-tight sm:mt-8 sm:text-4xl">
        {fatherName}
      </h2>
      <p className="mt-4 text-center text-[#5c5648] italic">{t("manager.cert.hasCompleted")}</p>
      <p className="mt-2 text-center text-base font-medium sm:text-lg">{trainingName}</p>
      <div className="mx-auto mt-6 h-px w-16 bg-[#326638] sm:mt-8" />
      <dl className="mt-6 grid gap-4 text-sm sm:mt-8 sm:grid-cols-3 sm:gap-5">
        <div className="text-center sm:text-start">
          <dt className="text-[11px] tracking-[0.16em] text-[#5c5648] uppercase">
            {t("manager.cert.completed")}
          </dt>
          <dd className="mt-1 font-medium">{completedOn}</dd>
        </div>
        <div className="text-center">
          <dt className="text-[11px] tracking-[0.16em] text-[#5c5648] uppercase">
            {t("manager.cert.serial")}
          </dt>
          <dd className="mt-1 break-all font-mono text-xs">{serialNumber}</dd>
        </div>
        <div className="text-center sm:text-end">
          <dt className="text-[11px] tracking-[0.16em] text-[#5c5648] uppercase">
            {t("manager.cert.issuedBy")}
          </dt>
          <dd className="mt-1 font-medium">{managerName}</dd>
        </div>
      </dl>
    </article>
  );
}
