import Link from "next/link";
import { notFound } from "next/navigation";

import { ChoiceAssessmentPlayer } from "@/components/assessments/choice-assessment-player";
import { buttonVariants } from "@/components/ui/button";
import {
  firstPartyAdminPath,
  isFirstPartyAssessmentKey,
} from "@/lib/assessments/first-party";
import { loadFirstPartyCatalog } from "@/lib/assessments/first-party-data";
import { isChoiceItem, listInstrumentDesignations } from "@/lib/assessments/instrument";
import { requireRole } from "@/lib/auth/session";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminFirstPartyPreviewPage({
  params,
}: {
  params: Promise<{ assessmentKey: string }>;
}) {
  const { assessmentKey } = await params;
  await requireRole("admin");
  if (!isFirstPartyAssessmentKey(assessmentKey)) notFound();
  const assessment = await loadFirstPartyCatalog(assessmentKey);
  if (!assessment) notFound();

  const items = assessment.instrument.items.filter(isChoiceItem).map((item) => ({
    id: item.id,
    prompt: item.prompt,
    choices: item.choices,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/assessments" className={interactiveLinkClassName}>
            Assessments
          </Link>
          <span className="text-white/20">|</span>
          <Link href={firstPartyAdminPath(assessment.key)} className={interactiveLinkClassName}>
            {assessment.title}
          </Link>
          <span className="text-white/20">|</span>
          <span>Preview</span>
        </p>
        <Link
          href={firstPartyAdminPath(assessment.key)}
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          Edit assessment
        </Link>
      </div>
      <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
        Super-admin preview. Answers are not saved. Fathers see this after a
        Leader shares it.
      </div>
      <ChoiceAssessmentPlayer
        assessmentKey={assessment.key}
        title={assessment.title}
        copy={assessment.copy}
        items={items}
        initialAnswers={{}}
        completed={null}
        preview
        instrument={assessment.instrument}
        designations={listInstrumentDesignations(assessment.instrument)}
        listHref="/admin/assessments"
      />
    </div>
  );
}
