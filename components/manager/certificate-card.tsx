import {
  CertificateFace,
  certificateFaceLabels,
} from "@/components/certificates/certificate-face";
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
    <CertificateFace
      fatherName={fatherName}
      trainingName={trainingName}
      completedOn={completedOn}
      serialNumber={serialNumber}
      managerName={managerName}
      labels={certificateFaceLabels(t)}
    />
  );
}
