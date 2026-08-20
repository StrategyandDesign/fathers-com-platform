import Link from "next/link";
import { notFound } from "next/navigation";

import { IntakeStatusBadge, RightsStatusBadge } from "@/components/admin/sourcing-status";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { openIntakeDraft, updateTrainingIntake } from "@/lib/admin/sourcing-actions";
import { loadTrainingIntake } from "@/lib/admin/sourcing-data";
import { SessionOutlineField } from "@/components/admin/session-outline-field";
import {
  INTAKE_STATUSES,
  INTAKE_STATUS_LABEL,
  OUTLINE_SESSION_MAX,
  RIGHTS_STATUSES,
  RIGHTS_STATUS_LABEL,
  countSessionOutline,
  outlineSessionWarning,
  parseSessionOutline,
  sourcedReleaseBlocker,
} from "@/lib/admin/sourcing";
import { requireRole } from "@/lib/auth/session";
import { fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminTrainingIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");
  const intake = await loadTrainingIntake(id);
  if (!intake) notFound();

  const outline = intake.outline ?? "";
  const sessions = parseSessionOutline(outline);
  const outlineWarning = outlineSessionWarning(countSessionOutline(outline));
  const releaseBlocker = sourcedReleaseBlocker(intake);

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/trainings" className={interactiveLinkClassName}>
          Trainings
        </Link>
        <span className="text-white/20">|</span>
        <Link href="/admin/trainings/sources" className={interactiveLinkClassName}>
          Bring in
        </Link>
        <span className="text-white/20">|</span>
        <Link
          href={`/admin/trainings/sources/${intake.sourceId}`}
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
            From {intake.sourceName}. Prepare it here, then use the ordinary
            sandbox and release path.
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
            After Stage and Ready, you can publish and release this to Leaders.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {intake.trainingId ? (
          <>
            <Link
              href={`/admin/trainings/${intake.trainingId}`}
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              Open sandbox draft
            </Link>
            <Link
              href={`/admin/trainings/${intake.trainingId}/stage`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              Stage
            </Link>
          </>
        ) : (
          <form action={openIntakeDraft}>
            <input type="hidden" name="intake_id" value={intake.id} />
            <Button type="submit" className="w-full sm:w-auto">
              Open as draft
            </Button>
          </form>
        )}
      </div>

      {sessions.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Outline preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {sessions.length === 1
              ? "1 session will be created from this outline."
              : `${sessions.length} of ${OUTLINE_SESSION_MAX} sessions will be created from this outline.`}
          </p>
          {outlineWarning ? (
            <p className="mt-2 text-sm text-destructive">{outlineWarning}</p>
          ) : null}
          <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm">
            {sessions.map((session, index) => (
              <li key={`${session.title}-${index}`}>
                <span className="font-medium">{session.title}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {session.videoUrl ?? "No film yet"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <form action={updateTrainingIntake} className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="intake_id" value={intake.id} />
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input className={fieldClassName} name="title" defaultValue={intake.title} required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Audience</span>
          <input className={fieldClassName} name="audience" defaultValue={intake.audience ?? ""} />
        </label>
        <SessionOutlineField defaultValue={intake.outline ?? ""} />
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
          <textarea
            className={textareaClassName}
            name="rights_notes"
            defaultValue={intake.rightsNotes ?? ""}
          />
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
        <Button type="submit" className="w-full sm:w-auto">
          Save intake
        </Button>
      </form>
    </div>
  );
}
