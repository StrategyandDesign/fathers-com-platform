import Link from "next/link";

import { AssessmentQuestionEditor } from "@/components/assessments/question-editor";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { createAssessment } from "@/lib/assessments/actions";
import { requireRole } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

export default async function ManagerNewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  await requireRole("manager");
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/manager/assessments" className={interactiveLinkClassName}>
          {t("manager.assessments.title")}
        </Link>
        <span className="px-2 text-white/20">|</span>
        <span>{t("manager.assessments.newCrumb")}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("manager.assessments.new")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.assessments.newLead")}
        </p>
      </div>
      <Flash error={params.error} notice={params.notice} />

      <form action={createAssessment} className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">{t("common.title")}</span>
          <input
            className={fieldClassName}
            name="title"
            required
            maxLength={200}
            aria-invalid={Boolean(params.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">{t("common.description")}</span>
          <textarea className={textareaClassName} name="description" maxLength={2000} />
        </label>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("manager.assessments.questions")}</p>
          <AssessmentQuestionEditor />
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          {t("manager.assessments.create")}
        </Button>
      </form>
    </div>
  );
}
