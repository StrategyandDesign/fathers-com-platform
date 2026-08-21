import { redirect } from "next/navigation";

import { ChoiceAssessmentPlayer } from "@/components/assessments/choice-assessment-player";
import { Flash } from "@/components/manager/flash";
import { isFirstPartyAssessmentKey } from "@/lib/assessments/first-party";
import { loadFatherFirstPartyAccess, loadFirstPartyCatalog } from "@/lib/assessments/first-party-data";
import { isChoiceItem } from "@/lib/assessments/instrument";
import { requireRole } from "@/lib/auth/session";

export default async function FatherFirstPartyAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentKey: string }>;
  searchParams: Promise<{ q?: string; view?: string; error?: string; notice?: string }>;
}) {
  const { assessmentKey } = await params;
  const query = await searchParams;
  const { user } = await requireRole("father");
  if (!isFirstPartyAssessmentKey(assessmentKey)) {
    redirect("/father/assessments");
  }
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  if (!assessment) {
    redirect("/father/assessments");
  }

  const access = await loadFatherFirstPartyAccess(user.id, assessmentKey);
  if (!access || (!access.canStart && !access.attempt)) {
    redirect("/father/assessments?error=flash.keystoneUnavailable");
  }

  const items = assessment.instrument.items.filter(isChoiceItem).map((item) => ({
    id: item.id,
    prompt: item.prompt,
    choices: item.choices,
  }));
  const completed =
    access.attempt?.completedAt && access.attempt.outcomeLabel
      ? {
          total: access.attempt.total ?? 0,
          maxTotal: items.length * assessment.instrument.scoring.scale.max,
          outcomeLabel: access.attempt.outcomeLabel,
          outcomeDescription: access.attempt.outcomeDescription,
        }
      : null;

  return (
    <div className="space-y-6">
      <Flash error={query.error} notice={query.notice} />
      <ChoiceAssessmentPlayer
        assessmentKey={assessment.key}
        title={assessment.title}
        copy={assessment.copy}
        items={items}
        initialAnswers={access.attempt?.answers ?? {}}
        completed={completed}
      />
    </div>
  );
}
