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

export function resolveCertificateIssuerName(input: {
  storedName?: string | null;
  profileName?: string | null;
  leaderName?: string | null;
}) {
  const stored = input.storedName?.trim();
  if (stored) return stored.slice(0, 80);
  const profile = input.profileName?.trim();
  if (profile) return profile.slice(0, 80);
  const leader = input.leaderName?.trim();
  if (leader) return leader.slice(0, 80);
  return "";
}

export function formatCertificateDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function certificatePreviewPath(certificateId: string) {
  return `/father/certificates/${certificateId}`;
}

export function certificateDownloadPath(certificateId: string) {
  return `/api/certificates/${certificateId}/download`;
}

export function certificateFilename(serialNumber: string) {
  const safe = serialNumber.replace(/[^A-Za-z0-9._-]+/g, "-");
  return `Fathers.com-${safe}.pdf`;
}
