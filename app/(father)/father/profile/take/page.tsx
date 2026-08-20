import { redirect } from "next/navigation";

import { KeystonePlayer } from "@/components/profile/keystone-player";
import { loadFatherAssessmentAccess } from "@/lib/assessments/data";
import { requireRole } from "@/lib/auth/session";
import { ensureProfileDraft, loadLatestProfile, loadProfileDraft } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, getProfileQuestion } from "@/lib/father/questions";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherProfileTakePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [completed, existingDraft, access] = await Promise.all([
    loadLatestProfile(user.id),
    loadProfileDraft(user.id),
    loadFatherAssessmentAccess(user.id),
  ]);

  if (completed && !existingDraft) {
    redirect("/father/assessments");
  }
  if (!existingDraft && !access.canStartKeystone) {
    redirect("/father/assessments?error=flash.keystoneUnavailable");
  }

  const draft = existingDraft ?? (await ensureProfileDraft(user.id));
  const requested = Number(params.q ?? draft.current_index);
  const questionId = Number.isInteger(requested)
    ? Math.min(PROFILE_QUESTION_COUNT, Math.max(1, requested))
    : draft.current_index;
  const question = getProfileQuestion(questionId);

  if (!question) {
    redirect("/father/profile");
  }

  return (
    <KeystonePlayer
      question={question}
      saved={draft.answers[String(question.id)]}
      error={params.error}
      t={t}
    />
  );
}
