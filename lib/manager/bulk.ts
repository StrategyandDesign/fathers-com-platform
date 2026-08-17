import { isTrainingAssignable, type Session, type Training } from "@/lib/father/types";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { translateBulkReason } from "@/lib/i18n/flash";
import { createTranslator } from "@/lib/i18n/translate";
import type { TrainingProgress } from "@/lib/manager/types";

export const BULK_ACTIONS = ["assign", "complete", "certificates"] as const;
export const MAX_BULK = 40;

export type BulkAction = (typeof BULK_ACTIONS)[number];

export type BulkPlanRow = {
  fatherId: string;
  name: string;
  eligible: boolean;
  reason?: string;
};

export const BULK_CONFIRM = {
  complete: "MARK COMPLETE",
  certificates: "ISSUE CERTIFICATES",
} as const;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBulkAction(value: string): value is BulkAction {
  return (BULK_ACTIONS as readonly string[]).includes(value);
}

export function parseFatherIds(values: string[] | string | undefined) {
  const raw = Array.isArray(values) ? values : values ? [values] : [];
  const ids = [...new Set(raw.map((value) => value.trim()).filter((value) => UUID.test(value)))];
  return ids.slice(0, MAX_BULK);
}

export function bulkActionLabel(action: BulkAction) {
  if (action === "assign") return "Assign training";
  if (action === "complete") return "Mark complete";
  return "Issue certificates";
}

export function confirmToken(action: BulkAction) {
  if (action === "complete") return BULK_CONFIRM.complete;
  if (action === "certificates") return BULK_CONFIRM.certificates;
  return null;
}

export function planBulkAssign(
  cards: TrainingProgress[],
  training: Training,
  reviewStatus?: string | null
) {
  if (!isTrainingAssignable(training, reviewStatus)) {
    return {
      eligible: false,
      reason: training.released_at
        ? "Not accepted for this organization yet."
        : "That training is not published.",
    };
  }
  const card = cards.find((row) => row.training.id === training.id);
  if (card?.assigned) return { eligible: false, reason: "Already assigned." };
  return { eligible: true };
}

export function planBulkComplete(
  cards: TrainingProgress[],
  training: Training,
  session: Session | null
) {
  const card = cards.find((row) => row.training.id === training.id);
  if (!card || card.total === 0) {
    return { eligible: false, reason: "That training has no sessions yet." };
  }
  if (session && session.training_id !== training.id) {
    return { eligible: false, reason: "That session is not in the selected training." };
  }
  if (card.completed === card.total) {
    return { eligible: false, reason: "That training is already complete." };
  }
  return { eligible: true };
}

export function planBulkCertificates(cards: TrainingProgress[], training: Training) {
  const card = cards.find((row) => row.training.id === training.id);
  if (!card || card.total === 0) {
    return { eligible: false, reason: "That training has no sessions yet." };
  }
  if (card.completed < card.total) {
    return { eligible: false, reason: "Training is not fully complete." };
  }
  if (card.certificate) {
    return { eligible: false, reason: "A certificate is already on file." };
  }
  return { eligible: true };
}

export function formatBulkNotice(input: {
  action: BulkAction;
  trainingTitle: string;
  sessionTitle?: string | null;
  ok: string[];
  skipped: Array<{ name: string; reason: string }>;
  failed: Array<{ name: string; reason: string }>;
  locale?: Locale;
}) {
  const locale = input.locale ?? DEFAULT_LOCALE;
  if (locale !== "he") {
    const target = input.sessionTitle
      ? `${input.sessionTitle} in ${input.trainingTitle}`
      : input.trainingTitle;
    const verb =
      input.action === "assign"
        ? "Assigned"
        : input.action === "complete"
          ? "Marked complete"
          : "Issued certificates for";
    const lines = [
      `${verb} ${target} for ${input.ok.length} participant${input.ok.length === 1 ? "" : "s"}.`,
    ];
    if (input.skipped.length > 0) {
      lines.push(
        `Skipped ${input.skipped.length}: ${input.skipped
          .slice(0, 8)
          .map((row) => `${row.name} (${row.reason})`)
          .join("; ")}${input.skipped.length > 8 ? "…" : ""}`
      );
    }
    if (input.failed.length > 0) {
      lines.push(
        `Failed ${input.failed.length}: ${input.failed
          .slice(0, 8)
          .map((row) => `${row.name} (${row.reason})`)
          .join("; ")}${input.failed.length > 8 ? "…" : ""}`
      );
    }
    return lines.join(" ");
  }

  const t = createTranslator(locale);
  const target = input.sessionTitle
    ? t("manager.bulk.inTraining", {
        session: input.sessionTitle,
        training: input.trainingTitle,
      })
    : input.trainingTitle;
  const noticeKey =
    input.action === "assign"
      ? input.ok.length === 1
        ? "manager.bulk.noticeAssign"
        : "manager.bulk.noticeAssignMany"
      : input.action === "complete"
        ? input.ok.length === 1
          ? "manager.bulk.noticeComplete"
          : "manager.bulk.noticeCompleteMany"
        : input.ok.length === 1
          ? "manager.bulk.noticeCerts"
          : "manager.bulk.noticeCertsMany";
  const lines = [t(noticeKey, { target, n: input.ok.length })];
  const named = (row: { name: string; reason: string }) =>
    `${translateBulkReason(row.name, t) || row.name} (${translateBulkReason(row.reason, t)})`;
  if (input.skipped.length > 0) {
    lines.push(
      t("manager.bulk.skipped", {
        n: input.skipped.length,
        list: `${input.skipped.slice(0, 8).map(named).join("; ")}${
          input.skipped.length > 8 ? "…" : ""
        }`,
      })
    );
  }
  if (input.failed.length > 0) {
    lines.push(
      t("manager.bulk.failed", {
        n: input.failed.length,
        list: `${input.failed.slice(0, 8).map(named).join("; ")}${
          input.failed.length > 8 ? "…" : ""
        }`,
      })
    );
  }
  return lines.join(" ");
}
