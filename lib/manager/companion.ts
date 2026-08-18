import type { ImpactSnapshot } from "@/lib/manager/impact";
import {
  cooldownRemaining,
  daysSince,
  needsNudge,
  type NudgeLogRow,
  type NudgeTemplateKey,
} from "@/lib/manager/nudges";
import type { ParticipantRow, TrainingProgress } from "@/lib/manager/types";

export type CompanionCopy = {
  key: string;
  vars?: Record<string, string | number>;
};

export type CompanionNudgeBlock = "prefs" | "cooldown" | "history" | null;

export type QuietSuggestion = {
  fatherId: string;
  name: string;
  daysQuiet: number;
  reason: CompanionCopy;
  template: NudgeTemplateKey;
  whyTemplate: CompanionCopy;
  canNudge: boolean;
  block: CompanionNudgeBlock;
  cooldownDays: number;
  readyCertTitle: string | null;
};

export type CompanionBriefing = {
  organizationName: string;
  fatherCount: number;
  startedPct: number;
  quietCount: number;
  certificatesIssued: number;
  certificatesReady: number;
  quiet: QuietSuggestion[];
  readyCertificates: Array<{
    fatherId: string;
    name: string;
    title: string;
  }>;
};

export function organizationLabel(
  names: Array<string | null | undefined>,
  fallback: string
) {
  const label = names.map((name) => name?.trim()).filter(Boolean).join(", ");
  return label || fallback;
}

export function stallPoint(cards: TrainingProgress[]) {
  const card = cards.find(
    (row) => row.assigned && !row.gated && row.completed < row.total && row.current?.session
  );
  if (!card?.current?.session) return null;
  return {
    sessionNumber: card.current.session.session_number,
    sessionTitle: card.current.session.title,
    trainingTitle: card.training?.title ?? card.current.session.title,
    completed: card.completed,
    total: card.total,
  };
}

export function readyCertificateTitle(cards: TrainingProgress[]) {
  const card = cards.find(
    (row) => row.total > 0 && row.completed === row.total && !row.certificate
  );
  return card?.training.title ?? null;
}

export function suggestNudgeTemplate(
  lastActivity: string | null | undefined,
  cards: TrainingProgress[]
): NudgeTemplateKey {
  const days = daysSince(lastActivity);
  const started = cards.some((card) => card.assigned && card.completed > 0);
  if (!Number.isFinite(days) || days >= 21) return "welcome_back";
  if (started) return "encouragement";
  return "continue";
}

export function whyTemplateCopy(template: NudgeTemplateKey): CompanionCopy {
  if (template === "encouragement") return { key: "manager.companion.whyEncouragement" };
  if (template === "welcome_back") return { key: "manager.companion.whyWelcomeBack" };
  return { key: "manager.companion.whyContinue" };
}

export function quietReasonCopy(
  lastActivity: string | null | undefined,
  cards: TrainingProgress[]
): CompanionCopy {
  const stall = stallPoint(cards);
  if (stall) {
    return {
      key: "manager.companion.reasonStalledTitle",
      vars: { n: stall.sessionNumber, title: stall.sessionTitle },
    };
  }
  const days = daysSince(lastActivity);
  if (!Number.isFinite(days)) return { key: "manager.companion.reasonNoActivity" };
  if (days <= 1) return { key: "manager.companion.reasonQuietOne" };
  return { key: "manager.companion.reasonQuietDays", vars: { days } };
}

export function countStarted(
  participants: ParticipantRow[],
  trainingProgressFor: (fatherId: string) => TrainingProgress[]
) {
  return participants.filter((participant) => {
    const cards = trainingProgressFor(participant.fatherId);
    return cards.some((card) => card.completed > 0 || Boolean(card.current?.progress));
  }).length;
}

function rankQuiet(suggestion: QuietSuggestion) {
  return (
    suggestion.daysQuiet +
    (suggestion.reason.key.includes("Stalled") ||
    suggestion.reason.key === "manager.companion.reasonStalledTitle"
      ? 8
      : 0) +
    (suggestion.template === "encouragement" ? 2 : 0)
  );
}

export function buildQuietSuggestion(
  participant: ParticipantRow,
  cards: TrainingProgress[],
  history: NudgeLogRow[],
  remindersAllowed: boolean | null,
  historyUnavailable: boolean
): QuietSuggestion {
  const template = suggestNudgeTemplate(participant.lastActivity, cards);
  const cooldownDays = cooldownRemaining(history);
  const block: CompanionNudgeBlock = historyUnavailable
    ? "history"
    : remindersAllowed === false
      ? "prefs"
      : cooldownDays > 0
        ? "cooldown"
        : null;

  return {
    fatherId: participant.fatherId,
    name: participant.name,
    daysQuiet: Number.isFinite(daysSince(participant.lastActivity))
      ? daysSince(participant.lastActivity)
      : 99,
    reason: quietReasonCopy(participant.lastActivity, cards),
    template,
    whyTemplate: whyTemplateCopy(template),
    canNudge: block === null,
    block,
    cooldownDays,
    readyCertTitle: readyCertificateTitle(cards),
  };
}

export function buildCompanionBriefing(input: {
  organizationName: string;
  participants: ParticipantRow[];
  trainingProgressFor: (fatherId: string) => TrainingProgress[];
  certificatesIssued: number;
  historyByFather: Map<string, NudgeLogRow[]>;
  reminderPrefs: Map<string, boolean | null>;
  historyUnavailable: boolean;
  limit?: number;
}): CompanionBriefing {
  const quietParticipants = input.participants.filter((participant) =>
    needsNudge(participant.lastActivity, input.trainingProgressFor(participant.fatherId))
  );

  const quiet = quietParticipants
    .map((participant) =>
      buildQuietSuggestion(
        participant,
        input.trainingProgressFor(participant.fatherId),
        input.historyByFather.get(participant.fatherId) ?? [],
        input.reminderPrefs.get(participant.fatherId) ?? null,
        input.historyUnavailable
      )
    )
    .sort((left, right) => rankQuiet(right) - rankQuiet(left));

  const readyCertificates: CompanionBriefing["readyCertificates"] = [];
  for (const participant of input.participants) {
    const title = readyCertificateTitle(input.trainingProgressFor(participant.fatherId));
    if (title) {
      readyCertificates.push({
        fatherId: participant.fatherId,
        name: participant.name,
        title,
      });
    }
  }

  const started = countStarted(input.participants, input.trainingProgressFor);
  const fatherCount = input.participants.length;

  return {
    organizationName: input.organizationName,
    fatherCount,
    startedPct: fatherCount === 0 ? 0 : Math.round((started / fatherCount) * 100),
    quietCount: quiet.length,
    certificatesIssued: input.certificatesIssued,
    certificatesReady: readyCertificates.length,
    quiet: quiet.slice(0, input.limit ?? quiet.length),
    readyCertificates,
  };
}

export function funderTrendCopy(snapshot: ImpactSnapshot): CompanionCopy {
  const current = snapshot.trend.sessionsCompleted.current;
  const previous = snapshot.trend.sessionsCompleted.previous;
  if (current > previous) {
    return {
      key: "manager.companion.trendUp",
      vars: { previous, current, days: snapshot.periodDays },
    };
  }
  if (current < previous) {
    return {
      key: "manager.companion.trendDown",
      vars: { previous, current, days: snapshot.periodDays },
    };
  }
  return { key: "manager.companion.trendSame", vars: { days: snapshot.periodDays } };
}

export function funderNarrativeVars(
  snapshot: ImpactSnapshot,
  organizationName: string
) {
  return {
    days: snapshot.periodDays,
    org: organizationName,
    enrolled: snapshot.enrolled,
    startedPct: snapshot.startedTrainingPct,
    onePct: snapshot.completedOneSessionPct,
    fullyPct: snapshot.fullyCompletedPct,
    certs: snapshot.certificatesIssued,
  };
}
