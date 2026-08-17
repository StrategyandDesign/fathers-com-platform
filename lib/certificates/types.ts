export type CertificatePayload = {
  fatherName: string;
  trainingName: string;
  completedOn: string;
  serialNumber: string;
  managerName: string;
};

export type IssuedCertificate = {
  id: string;
  serialNumber: string;
  issuedAt: string;
  trainingTitle: string;
  issuerName: string;
};

export function formatCertificateDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function certificateDownloadPath(certificateId: string) {
  return `/api/certificates/${certificateId}/download`;
}

export function certificateFilename(serialNumber: string) {
  const safe = serialNumber.replace(/[^A-Za-z0-9._-]+/g, "-");
  return `Fathers.com-${safe}.pdf`;
}
