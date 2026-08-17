import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createSession,
  deleteSession,
  deleteTraining,
  setTrainingPublished,
  updateSession,
  updateTraining,
} from "@/lib/admin/actions";
import { loadAdminTraining, loadTrainingUsage } from "@/lib/admin/data";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

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
  const seeded = training.slug === "fundamentals";
  const canDelete =
    !seeded && usage.assignmentCount + usage.progressCount + usage.certificateCount === 0;
  const nextNumber =
    training.sessions.reduce((max, session) => Math.max(max, session.session_number), 0) + 1;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/trainings" className={interactiveLinkClassName}>
          Trainings
        </Link>
        <span className="text-white/20">|</span>
        <span className="min-w-0">{training.title}</span>
      </p>
      <Flash error={flash.error} notice={flash.notice} />

      <form action={updateTraining} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="training_id" value={training.id} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {training.title}
          </h1>
          <span className={training.published ? "text-sm text-primary" : "text-sm text-muted-foreground"}>
            {training.published ? "Published" : "Unpublished"}
          </span>
        </div>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input className={fieldClassName} name="title" defaultValue={training.title} required />
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
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea
            className={textareaClassName}
            name="description"
            defaultValue={training.description ?? ""}
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
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg text-sm outline-none transition-colors duration-150 ease-out hover:bg-white/5 focus-within:ring-3 focus-within:ring-ring/50 active:opacity-90">
          <input
            type="checkbox"
            name="published"
            value="true"
            defaultChecked={training.published}
            className="size-4 accent-primary"
          />
          <span>Published (visible for new assignment)</span>
        </label>
        <Button type="submit" className="w-full sm:w-auto">
          Save training
        </Button>
      </form>

      <form action={setTrainingPublished} className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <input type="hidden" name="training_id" value={training.id} />
        <input type="hidden" name="published" value={training.published ? "false" : "true"} />
        <h2 className="font-heading text-lg font-semibold">
          {training.published ? "Unpublish" : "Publish"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unpublished trainings are hidden from the father catalog and new manager
          assignments. Fathers who already have progress can still continue.
        </p>
        <Button type="submit" variant="outline" className="mt-4 w-full sm:w-auto">
          {training.published ? "Unpublish" : "Publish"}
        </Button>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Title, order, YouTube URL, and keyline. Sessions with progress cannot be deleted.
          </p>
          {training.sessions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No sessions yet. Add the first one below.
            </p>
          ) : null}
        </div>

        {training.sessions.map((session) => (
          <form
            key={session.id}
            action={updateSession}
            className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
          >
            <input type="hidden" name="training_id" value={training.id} />
            <input type="hidden" name="session_id" value={session.id} />
            <p className="text-sm text-muted-foreground">Session {session.session_number}</p>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Title</span>
              <input className={fieldClassName} name="title" defaultValue={session.title} required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Session number</span>
                <input
                  className={fieldClassName}
                  name="session_number"
                  type="number"
                  min={1}
                  defaultValue={session.session_number}
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-muted-foreground">Order</span>
                <input
                  className={fieldClassName}
                  name="order_index"
                  type="number"
                  defaultValue={session.order_index}
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Keyline</span>
              <input className={fieldClassName} name="keyline" defaultValue={session.keyline ?? ""} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">YouTube URL</span>
              <input
                className={fieldClassName}
                name="video_url"
                defaultValue={session.video_url ?? ""}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="w-full sm:w-auto">
                Save session
              </Button>
              <Button
                type="submit"
                formAction={deleteSession}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                Delete session
              </Button>
            </div>
          </form>
        ))}

        <form action={createSession} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <input type="hidden" name="training_id" value={training.id} />
          <h3 className="font-heading text-lg font-semibold">Add session</h3>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Title</span>
            <input className={fieldClassName} name="title" required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Session number</span>
              <input
                className={fieldClassName}
                name="session_number"
                type="number"
                min={1}
                defaultValue={nextNumber}
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Order</span>
              <input
                className={fieldClassName}
                name="order_index"
                type="number"
                defaultValue={nextNumber}
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Keyline</span>
            <input className={fieldClassName} name="keyline" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">YouTube URL</span>
            <input className={fieldClassName} name="video_url" />
          </label>
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
              ? "This training has no assignments or progress."
              : "This training has assignments or progress. Unpublish it instead."}
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
