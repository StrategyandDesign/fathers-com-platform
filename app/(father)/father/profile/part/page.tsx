import { redirect } from "next/navigation";

import { KeystonePartClose } from "@/components/profile/keystone-part-close";
import { requireRole } from "@/lib/auth/session";
import { loadProfileDraft } from "@/lib/father/profile";
import {
  PROFILE_QUESTION_COUNT,
  PROFILE_SECTION_COUNT,
  profileSectionForQuestion,
} from "@/lib/father/questions";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherProfilePartPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const draft = await loadProfileDraft(user.id);
  const part = Number(params.n);

  if (!draft || !Number.isInteger(part) || part < 1 || part >= PROFILE_SECTION_COUNT) {
    redirect("/father/profile/take");
  }

  const section = profileSectionForQuestion(part * (PROFILE_QUESTION_COUNT / PROFILE_SECTION_COUNT));
  if (draft.answers[String(section.endId)] == null) {
    redirect(`/father/profile/take?q=${section.endId}`);
  }

  return (
    <KeystonePartClose
      part={part}
      nextHref={`/father/profile/take?q=${section.endId + 1}`}
      exitHref="/father/assessments"
      t={t}
    />
  );
}
