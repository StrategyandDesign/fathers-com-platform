import Link from "next/link";
import { notFound } from "next/navigation";

import { IntakeStatusBadge, RightsStatusBadge } from "@/components/admin/sourcing-status";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import {
  openAssessmentDraft,
  updateAssessmentIntake,
} from "@/lib/admin/assessment-sourcing-actions";
import { loadAssessmentIntake } from "@/lib/admin/assessment-sourcing-data";
import { sourcedReleaseBlocker } from "@/lib/admin/assessment-sourcing";
import {
  INTAKE_STATUSES,
  INTAKE_STATUS_LABEL,
  RIGHTS_STATUSES,
  RIGHTS_STATUS_LABEL,
} from "@/lib/admin/sourcing";
import { compileInstrument, evaluateInstrument, sampleAnswers } from "@/lib/assessments/instrument";
import { requireRole } from "@/lib/auth/session";
import { fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

export default async function AdminAssessmentIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");
  const intake = await loadAssessmentIntake(id);
  if (!intake) notFound();

  const compiled = compileInstrument(intake.questions ?? "", intake.scoring ?? "");
  const releaseBlocker = sourcedReleaseBlocker(intake);
  const preview = compiled.ok
    ? {
        low: evaluateInstrument(compiled.value, sampleAnswers(compiled.value, compiled.value.scoring.scale.min)),
        high: evaluateInstrument(compiled.value, sampleAnswers(compiled.value, compiled.value.scoring.scale.max)),
      }
    : null;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/assessments" className={interactiveLinkClassName}>
          Assessments
        </Link>
        <span className="text-white/20">|</span>
        <Link href="/admin/assessments/sources" className={interactiveLinkClassName}>
          Bring in
        </Link>
        <span className="text-white/20">|</span>
        <Link
          href={`/admin/assessments/sources/${intake.sourceId}`}
          className={interactiveLinkClassName}
        >
          {intake.sourceName}
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0">{intake.title}</span>
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{intake.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            From {intake.sourceName}. The questions and scoring key compile into
            one stored model. Fathers take a sourced instrument after a later
            delivery path is wired.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <RightsStatusBadge status={intake.rightsStatus} />
          <IntakeStatusBadge status={intake.status} />
        </div>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      {releaseBlocker ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <p className="font-medium">Not ready to release</p>
          <p className="mt-1 text-sm text-muted-foreground">{releaseBlocker}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 sm:px-5">
          <p className="font-medium">Rights are cleared</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep the scoring preview green, then mark the draft Ready before
            Leader review.
          </p>
        </div>
      )}

      {!intake.platformAssessmentId ? (
        <form action={openAssessmentDraft}>
          <input type="hidden" name="intake_id" value={intake.id} />
          <Button type="submit" className="w-full sm:w-auto">
            Open as draft
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          This intake has a sandbox draft on the Assessments list.
        </p>
      )}

      {compiled.ok ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Scoring preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {compiled.value.items.length} questions ·{" "}
            {compiled.value.scoring.dimensions.map((dimension) => dimension.label).join(", ")}{" "}
            · {compiled.value.scoring.scale.min}-{compiled.value.scoring.scale.max} ·{" "}
            {compiled.value.scoring.method === "mean_coded" ? "mean" : "sum"}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {compiled.value.items.map((item) => (
              <li key={item.id}>
                <span className="text-muted-foreground">
                  {item.dimension}
                  {item.coding === -1 ? " · reverse" : ""}
                </span>
                <span className="mt-0.5 block">{item.prompt}</span>
              </li>
            ))}
          </ul>
          {preview ? (
            <div className="mt-5 space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-black/20 px-4 py-3">
                  <dt className="text-sm text-muted-foreground">All low answers</dt>
                  <dd className="mt-1 font-medium">{preview.low.outcomeLabel}</dd>
                </div>
                <div className="rounded-lg border border-border bg-black/20 px-4 py-3">
                  <dt className="text-sm text-muted-foreground">All high answers</dt>
                  <dd className="mt-1 font-medium">{preview.high.outcomeLabel}</dd>
                </div>
              </dl>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {compiled.value.scoring.dimensions.map((dimension) => (
                  <li key={dimension.id}>
                    {dimension.label}: {preview.low.scores[dimension.id] ?? 0} low,{" "}
                    {preview.high.scores[dimension.id] ?? 0} high
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : intake.questions ? (
        <section className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <p className="font-medium">Scoring key needs a fix</p>
          <p className="mt-1 text-sm text-muted-foreground">{compiled.error}</p>
        </section>
      ) : null}

      <form action={updateAssessmentIntake} className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="intake_id" value={intake.id} />
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input className={fieldClassName} name="title" defaultValue={intake.title} required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Audience</span>
          <input className={fieldClassName} name="audience" defaultValue={intake.audience ?? ""} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea className={textareaClassName} name="description" defaultValue={intake.description ?? ""} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Questions</span>
          <textarea className={textareaClassName} name="questions" defaultValue={intake.questions ?? ""} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Scoring model</span>
          <textarea className={textareaClassName} name="scoring" defaultValue={intake.scoring ?? ""} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Rights</span>
          <select className={fieldClassName} name="rights_status" defaultValue={intake.rightsStatus}>
            {RIGHTS_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RIGHTS_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Rights notes</span>
          <textarea className={textareaClassName} name="rights_notes" defaultValue={intake.rightsNotes ?? ""} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Intake status</span>
          <select className={fieldClassName} name="status" defaultValue={intake.status}>
            {INTAKE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {INTAKE_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Save intake
        </Button>
      </form>
    </div>
  );
}
