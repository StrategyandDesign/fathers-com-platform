import Link from "next/link";

import { AssessmentQuestionEditor } from "@/components/assessments/question-editor";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { createAssessment } from "@/lib/assessments/actions";
import { requireRole } from "@/lib/auth/session";
import { fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

export default async function ManagerNewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("manager");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/manager/assessments" className={interactiveLinkClassName}>
          Assessments
        </Link>
        <span className="px-2 text-white/20">|</span>
        <span>New</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">New assessment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Title, optional description, and an ordered list of questions.
        </p>
      </div>
      <Flash error={params.error} notice={params.notice} />

      <form action={createAssessment} className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input
            className={fieldClassName}
            name="title"
            required
            maxLength={200}
            aria-invalid={Boolean(params.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea className={textareaClassName} name="description" maxLength={2000} />
        </label>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Questions</p>
          <AssessmentQuestionEditor />
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          Create assessment
        </Button>
      </form>
    </div>
  );
}
