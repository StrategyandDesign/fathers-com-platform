import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { takeHref } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import { loadProfileState } from "@/lib/father/profile";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function FatherAssessmentsPage() {
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const [assignments, { profile, draft }] = await Promise.all([
    loadFatherAssignments(user.id),
    loadProfileState(user.id),
  ]);
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;
  const answered = draft ? answeredCount(draft.answers) : 0;
  const keystoneHref = profile
    ? "/father/profile/results"
    : draft
      ? `/father/profile/take?q=${resumeAt}`
      : "/father/profile";
  const keystoneStatus = profile
    ? t("father.assessments.completedOn", { date: formatLongDate(profile.taken_at, locale) })
    : draft
      ? t("father.profile.progress", {
          n: resumeAt,
          total: PROFILE_QUESTION_COUNT,
          answered,
        })
      : t("father.profile.takeHint");
  const keystoneAction = profile
    ? t("father.assessments.view")
    : draft
      ? t("father.assessments.continue")
      : t("father.assessments.take");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("father.assessments.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("father.assessments.lead")}</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          <li>
            <Link
              href={keystoneHref}
              className={cn(
                "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                interactiveSurfaceClassName
              )}
            >
              <div className="min-w-0">
                <p className="font-medium">{t("father.profile.keystone")}</p>
                <p className="text-sm text-muted-foreground">{keystoneStatus}</p>
              </div>
              <span
                className={cn(
                  buttonVariants(),
                  "pointer-events-none w-full sm:w-auto"
                )}
              >
                {keystoneAction}
              </span>
            </Link>
          </li>
          {assignments.map(({ assignment, assessment, questionCount, answeredCount }) => (
            <li key={assignment.id}>
              <Link
                href={takeHref(assignment.id)}
                className={cn(
                  "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                  interactiveSurfaceClassName
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{assessment.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {questionCount === 0 && assignment.status !== "completed"
                      ? t("father.assessments.notReadyBody")
                      : t(
                          `father.assessments.${
                            assignment.status === "not_started"
                              ? "notStarted"
                              : assignment.status === "in_progress"
                                ? "inProgress"
                                : "completed"
                          }`
                        )}
                    {questionCount > 0
                      ? ` · ${t("father.assessments.answered", {
                          answered: answeredCount,
                          total: questionCount,
                        })}`
                      : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "pointer-events-none w-full sm:w-auto"
                  )}
                >
                  {assignment.status === "completed"
                    ? t("father.assessments.view")
                    : questionCount === 0
                      ? t("father.assessments.notReadyTitle")
                      : assignment.status === "in_progress"
                        ? t("father.assessments.continue")
                        : t("father.assessments.take")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
