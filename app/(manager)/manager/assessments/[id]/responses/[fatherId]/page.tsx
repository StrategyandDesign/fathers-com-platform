import Link from "next/link";
import { notFound } from "next/navigation";

import { loadManagerAssignmentResponses } from "@/lib/assessments/data";
import { ASSIGNMENT_STATUS_LABEL } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import { interactiveLinkClassName } from "@/lib/ui";

export default async function ManagerAssessmentResponsesPage({
  params,
}: {
  params: Promise<{ id: string; fatherId: string }>;
}) {
  const { id, fatherId } = await params;
  const { user } = await requireRole("manager");
  const detail = await loadManagerAssignmentResponses(user.id, id, fatherId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager/assessments" className={interactiveLinkClassName}>
          Assessments
        </Link>
        <span className="text-white/20">|</span>
        <Link
          href={`/manager/assessments/${detail.assessment.id}`}
          className={interactiveLinkClassName}
        >
          {detail.assessment.title}
        </Link>
        <span className="text-white/20">|</span>
        <Link
          href={`/manager/participants/${fatherId}`}
          className={interactiveLinkClassName}
        >
          {detail.assignment.fatherName}
        </Link>
      </p>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {detail.assignment.fatherName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.assessment.title} · {ASSIGNMENT_STATUS_LABEL[detail.assignment.status]}
        </p>
      </div>

      <ol className="space-y-4">
        {detail.questions.map((question, index) => {
          const answer = detail.answers.get(question.id);
          return (
            <li key={question.id} className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:p-6">
              <p className="text-sm text-muted-foreground">Question {index + 1}</p>
              <p className="mt-1 font-heading text-base font-semibold">{question.prompt}</p>
              <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
                {answer?.value ?? "No answer yet."}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
