import type { TrainingProgress } from "@/lib/manager/types";

export type CertificateDeskItem = {
  fatherId: string;
  name: string;
  trainingId: string;
  trainingTitle: string;
  serial?: string;
};

export function isReadyForCertificate(card: TrainingProgress) {
  return card.total > 0 && card.completed === card.total && !card.certificate;
}

export function buildCertificateDesk(input: {
  participants: Array<{ fatherId: string; name: string }>;
  trainingProgressFor: (fatherId: string) => TrainingProgress[];
}) {
  const ready: CertificateDeskItem[] = [];
  const issued: CertificateDeskItem[] = [];

  for (const participant of input.participants) {
    for (const card of input.trainingProgressFor(participant.fatherId)) {
      if (isReadyForCertificate(card)) {
        ready.push({
          fatherId: participant.fatherId,
          name: participant.name,
          trainingId: card.training.id,
          trainingTitle: card.training.title,
        });
        continue;
      }
      if (card.certificate) {
        issued.push({
          fatherId: participant.fatherId,
          name: participant.name,
          trainingId: card.training.id,
          trainingTitle: card.training.title,
          serial: card.certificate.serial_number,
        });
      }
    }
  }

  return { ready, issued };
}
