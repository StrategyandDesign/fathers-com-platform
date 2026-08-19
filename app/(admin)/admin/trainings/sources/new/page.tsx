import Link from "next/link";

import { bringInTraining } from "@/lib/admin/sourcing-actions";
import { loadTrainingSources } from "@/lib/admin/sourcing-data";
import { RIGHTS_STATUSES, RIGHTS_STATUS_LABEL } from "@/lib/admin/sourcing";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { loadTrainingRequest } from "@/lib/training-requests/data";
import { checkboxOptionClassName, fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

const REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminBringInTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; request?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const sources = await loadTrainingSources();
  const requestId = flash.request && REQUEST_ID.test(flash.request) ? flash.request : "";
  const request = requestId ? (await loadTrainingRequest(requestId)).request : null;

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/trainings" className={interactiveLinkClassName}>
          Trainings
        </Link>
        <span className="text-foreground/20">|</span>
        <Link href="/admin/trainings/sources" className={interactiveLinkClassName}>
          Bring in
        </Link>
        <span className="text-foreground/20">|</span>
        <span>New</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Bring in a training
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name the person or group, record whether you may use their films,
          then list the sessions they sent. Opening a draft uses the same
          sandbox as an in-house training: Film, Check-in, Action, Stage,
          Ready, then Release to Leaders.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      {request ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
          <p className="font-medium">From a Leader request</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.topic}
            {request.organizationName ? ` · ${request.organizationName}` : ""}
          </p>
        </div>
      ) : null}

      <form action={bringInTraining} className="max-w-2xl space-y-6">
        {requestId ? <input type="hidden" name="request_id" value={requestId} /> : null}

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Who it comes from</h2>
          <p className="text-sm text-muted-foreground">
            Pick someone you already recorded, or name a new person or group.
          </p>
          {sources.length > 0 ? (
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Existing source</span>
              <select className={fieldClassName} name="source_id" defaultValue="">
                <option value="">New source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Name</span>
            <input
              className={fieldClassName}
              name="source_name"
              placeholder="If you are adding a new source"
              aria-invalid={Boolean(flash.error) || undefined}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Contact name</span>
            <input className={fieldClassName} name="contact_name" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Contact email</span>
            <input className={fieldClassName} name="contact_email" type="email" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Channel or site</span>
            <input
              className={fieldClassName}
              name="channel_url"
              placeholder="https://"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Notes about this source</span>
            <textarea className={textareaClassName} name="source_notes" />
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">The training</h2>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Title</span>
            <input
              className={fieldClassName}
              name="title"
              required
              defaultValue={request?.topic ?? ""}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Audience</span>
            <input
              className={fieldClassName}
              name="audience"
              defaultValue={request?.audience ?? ""}
              placeholder="Who this is for"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Description</span>
            <textarea
              className={textareaClassName}
              name="description"
              defaultValue={request?.description ?? ""}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Session outline</span>
            <textarea
              className={textareaClassName}
              name="outline"
              placeholder={"One session per line.\nTitle | https://youtu.be/…"}
            />
            <span className="block text-sm text-muted-foreground">
              YouTube links only. Check-in and Action are written after the
              draft opens. A film still cannot be published over 6:00.
            </span>
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Rights</h2>
          <p className="text-sm text-muted-foreground">
            First release is blocked until this is marked Cleared. Do not
            release work you do not have permission to use.
          </p>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <select className={fieldClassName} name="rights_status" defaultValue="inquiry">
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
              placeholder="Date of the conversation, what they agreed to, where the written note lives."
            />
          </label>
          <label className={checkboxOptionClassName}>
            <input
              type="checkbox"
              name="open_draft"
              value="true"
              defaultChecked
              className="size-4 accent-primary"
            />
            <span>Open a sandbox draft now</span>
          </label>
        </section>

        <Button type="submit" className="w-full sm:w-auto">
          Save intake
        </Button>
      </form>
    </div>
  );
}
