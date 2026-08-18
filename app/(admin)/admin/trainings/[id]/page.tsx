import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createSession,
  deleteSession,
  deleteTraining,
  duplicateSession,
  moveSession,
  releaseTraining,
  setTrainingPublished,
  unreleaseTraining,
  updateSession,
  updateTraining,
} from "@/lib/admin/actions";
import { DevelopmentDesk } from "@/components/admin/development-desk";
import { DevelopmentStatusBadge } from "@/components/admin/development-status";
import { SessionAuthoringFields } from "@/components/admin/session-authoring-fields";
import { loadAdminTraining, loadTrainingUsage } from "@/lib/admin/data";
import { loadIntakeForTraining } from "@/lib/admin/sourcing-data";
import { sourcedReleaseBlocker } from "@/lib/admin/sourcing";
import { IntakeStatusBadge, RightsStatusBadge } from "@/components/admin/sourcing-status";
import { asDevelopmentStatus, isArchivedTraining } from "@/lib/admin/development";
import {
  isLegacyCatalogTraining,
  RELEASE_CONFIRM,
  trainingReleaseState,
  UNRELEASE_CONFIRM,
} from "@/lib/admin/release";
import { ReleaseStatusBadge } from "@/components/admin/release-status";
import { ReleaseTargetStatusList, ReleaseTargets } from "@/components/admin/release-targets";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/manager/types";
import { checkboxOptionClassName, fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { AdminFilmFlags, AdminSessionFilmFlags } from "@/components/admin/film-flags";

export default async function AdminTrainingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");
  const training = await loadAdminTraining(id);

  if (!training) notFound();

  const usage = await loadTrainingUsage(training.id);
  const intake = await loadIntakeForTraining(training.id);
  const rightsBlocker = sourcedReleaseBlocker(intake);
  const seeded = training.slug === "fundamentals";
  const canDelete =
    !seeded && usage.assignmentCount + usage.progressCount + usage.certificateCount === 0;
  const nextNumber =
    training.sessions.reduce((max, session) => Math.max(max, session.session_number), 0) + 1;
  const releaseState = trainingReleaseState(training);
  const legacy = isLegacyCatalogTraining(training);
  const archived = isArchivedTraining(training);
  const alreadyReleased = releaseState === "released";
  const canRelease =
    !archived &&
    training.published &&
    training.sessions.length > 0 &&
    (!rightsBlocker || alreadyReleased);
  const developmentStatus = asDevelopmentStatus(training.development_status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href="/admin/trainings" className={interactiveLinkClassName}>
            Trainings
          </Link>
          <span className="text-white/20">|</span>
          <span className="min-w-0">{training.title}</span>
        </p>
        <Link
          href={`/admin/trainings/${training.id}/stage`}
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          Open staging
        </Link>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form action={updateTraining} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="training_id" value={training.id} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {training.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {`${training.sessions.length} session${
                training.sessions.length === 1 ? "" : "s"
              }`}
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <DevelopmentStatusBadge status={developmentStatus} />
            <ReleaseStatusBadge state={releaseState} />
            <span className="text-sm text-muted-foreground">
              {training.published ? "Published" : "Unpublished"}
            </span>
          </div>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input
            className={fieldClassName}
            name="title"
            defaultValue={training.title}
            required
            aria-invalid={Boolean(flash.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Slug</span>
          <input
            className={fieldClassName}
            name="slug"
            defaultValue={training.slug}
            readOnly={seeded}
          />
          {seeded ? (
            <span className="block text-sm text-muted-foreground">
              Fathering Fundamentals slug is locked.
            </span>
          ) : null}
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Working title</span>
          <input
            className={fieldClassName}
            name="working_title"
            defaultValue={training.working_title ?? ""}
            maxLength={120}
            placeholder="Internal name. Fathers still see Title."
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea
            className={textareaClassName}
            name="description"
            defaultValue={training.description ?? ""}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Credit (Leaders see this)</span>
          <input
            className={fieldClassName}
            name="attribution"
            defaultValue={training.attribution ?? ""}
            maxLength={120}
            placeholder="Name of the outside teacher, if any"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Development notes</span>
          <textarea
            className={textareaClassName}
            name="development_notes"
            defaultValue={training.development_notes ?? ""}
            maxLength={4000}
            placeholder="Super-admin only. Early ideas, gaps, next sitting."
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Catalog order</span>
          <input
            className={fieldClassName}
            name="order_index"
            type="number"
            defaultValue={training.order_index}
          />
        </label>
        <label className={checkboxOptionClassName}>
          <input
            type="checkbox"
            name="published"
            value="true"
            defaultChecked={training.published}
            className="size-4 accent-primary"
          />
          <span>Published (ready to release, or already in the catalog)</span>
        </label>
        <Button type="submit" className="w-full sm:w-auto">
          Save training
        </Button>
      </form>

      <DevelopmentDesk training={training} usage={usage} />

      {intake ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">Sourced training</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Brought in from {intake.sourceName}. Rights must be cleared
                before the first release.
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <RightsStatusBadge status={intake.rightsStatus} />
              <IntakeStatusBadge status={intake.status} />
            </div>
          </div>
          {rightsBlocker ? (
            <p className="mt-4 text-sm text-muted-foreground">{rightsBlocker}</p>
          ) : null}
          <Link
            href={`/admin/trainings/intakes/${intake.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full sm:w-auto")}
          >
            Open intake
          </Link>
        </section>
      ) : null}

      <form action={setTrainingPublished} className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="training_id" value={training.id} />
        <input type="hidden" name="published" value={training.published ? "false" : "true"} />
        <h2 className="font-heading text-lg font-semibold">
          {training.published ? "Unpublish" : "Publish"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Publishing does not notify managers. Use Release to organizations
          below when the training is ready for review. Unpublished trainings
          stay off new assignment. Fathers who already have progress can still
          continue.
        </p>
        <Button type="submit" variant="outline" className="mt-4 w-full sm:w-auto">
          {training.published ? "Unpublish" : "Publish"}
        </Button>
      </form>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Release to organizations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Push to every organization or only the ones you select. Leaders
              must accept before they decide who among their fathers receives it.
            </p>
          </div>
          <ReleaseStatusBadge state={alreadyReleased ? "released" : "draft"} />
        </div>

        {alreadyReleased ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-lg border border-input bg-black/30 px-4 py-3">
              <p className="font-medium">Released {formatShortDate(training.released_at)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                by {training.releasedByName ?? "Super-admin"}
              </p>
            </div>
            <ReleaseTargetStatusList organizations={training.releaseTargets} />
            <form action={releaseTraining} className="space-y-4">
              <input type="hidden" name="training_id" value={training.id} />
              <p className="text-sm text-muted-foreground">
                Send this to more organizations, or again to one that declined.
              </p>
              <ReleaseTargets organizations={training.releaseTargets} defaultScope="selected" />
              <Button type="submit" className="w-full sm:w-auto" disabled={!canRelease}>
                Release to organizations
              </Button>
            </form>
            <form action={unreleaseTraining} className="space-y-4">
              <input type="hidden" name="training_id" value={training.id} />
              <p className="text-sm text-muted-foreground">
                Un-release withdraws pending reviews and stops new assignment
                for organizations that have not accepted. Existing assignments
                and progress stay.
              </p>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">
                  Type <span className="font-medium text-foreground">{UNRELEASE_CONFIRM}</span> to
                  confirm
                </span>
                <input
                  className={fieldClassName}
                  name="confirm"
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(flash.error) || undefined}
                />
              </label>
              <Button type="submit" variant="destructive" className="w-full sm:w-auto">
                Un-release
              </Button>
            </form>
          </div>
        ) : (
          <form action={releaseTraining} className="mt-5 space-y-4">
            <input type="hidden" name="training_id" value={training.id} />
            {archived ? (
              <p className="text-sm text-muted-foreground">
                Recover this training from the archive before releasing it to
                Leaders.
              </p>
            ) : !training.published ? (
              <p className="text-sm text-muted-foreground">
                Publish this training first. Release is a separate, deliberate
                step. Mark Ready for Review on the development desk first.
              </p>
            ) : training.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add at least one session before releasing it for review.
              </p>
            ) : rightsBlocker ? (
              <p className="text-sm text-muted-foreground">{rightsBlocker}</p>
            ) : legacy ? (
              <p className="text-sm text-muted-foreground">
                This training is already in the catalog and assignable. Releasing
                it sends it to the organizations you choose and hides it from
                new assignment until those managers accept.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Managers get an in-app notice and can preview, accept, or
                decline. Fathers are not enrolled until a manager assigns it.
              </p>
            )}
            {canRelease ? (
              <ReleaseTargets organizations={training.releaseTargets} defaultScope="all" />
            ) : null}
            {legacy ? (
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">
                  Type <span className="font-medium text-foreground">{RELEASE_CONFIRM}</span> to
                  confirm
                </span>
                <input
                  className={fieldClassName}
                  name="confirm"
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(flash.error) || undefined}
                />
              </label>
            ) : null}
            <Button type="submit" className="w-full sm:w-auto" disabled={!canRelease}>
              Release to organizations
            </Button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add, edit, reorder, duplicate, and remove sessions. Save incomplete
            work. Open Stage to walk Film → Check-in → Action as a Father will
            see it. Sessions with progress cannot be deleted. A film cannot be
            published over 6:00.
          </p>
          <AdminFilmFlags sessions={training.sessions} />
          {training.sessions.length === 0 ? (
            <EmptyState
              framed={false}
              className="mt-3 px-0 py-0"
              title="No sessions yet"
            >
              Add the first one below. Fathers cannot start this training until
              it has a session.
            </EmptyState>
          ) : null}
        </div>

        {training.sessions.map((session, index) => (
          <form
            key={session.id}
            action={updateSession}
            className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
          >
            <input type="hidden" name="training_id" value={training.id} />
            <input type="hidden" name="session_id" value={session.id} />
            <p className="text-sm text-muted-foreground">Session {session.session_number}</p>
            <AdminSessionFilmFlags session={session} />
            <SessionAuthoringFields session={session} />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="submit" className="w-full sm:w-auto">
                Save session
              </Button>
              <Link
                href={`/admin/trainings/${training.id}/stage/sessions/${session.id}`}
                className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
              >
                Stage this session
              </Link>
              <Button
                type="submit"
                formAction={moveSession}
                name="direction"
                value="up"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={index === 0}
              >
                Move up
              </Button>
              <Button
                type="submit"
                formAction={moveSession}
                name="direction"
                value="down"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={index === training.sessions.length - 1}
              >
                Move down
              </Button>
              <Button
                type="submit"
                formAction={duplicateSession}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Duplicate
              </Button>
              <Button
                type="submit"
                formAction={deleteSession}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                Remove session
              </Button>
            </div>
          </form>
        ))}

        <form action={createSession} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <input type="hidden" name="training_id" value={training.id} />
          <h3 className="font-heading text-lg font-semibold">Add session</h3>
          <p className="text-sm text-muted-foreground">
            Save incomplete sessions. Ready and Release still require film,
            runtime, Check-in, and Action.
          </p>
          <SessionAuthoringFields nextNumber={nextNumber} />
          <Button type="submit" className="w-full sm:w-auto">
            Add session
          </Button>
        </form>
      </section>

      <form action={deleteTraining} className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="training_id" value={training.id} />
        <h2 className="font-heading text-lg font-semibold">Delete</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {seeded
            ? "Fathering Fundamentals cannot be deleted. Unpublish if you need to hide it from new assignment."
            : canDelete
              ? "This training has no assignments or progress. Prefer Archive if you may want the idea later."
              : "This training has assignments or progress. Archive or unpublish it instead."}
        </p>
        <Button
          type="submit"
          variant="destructive"
          className="mt-4 w-full sm:w-auto"
          disabled={!canDelete}
        >
          Delete training
        </Button>
      </form>
    </div>
  );
}
