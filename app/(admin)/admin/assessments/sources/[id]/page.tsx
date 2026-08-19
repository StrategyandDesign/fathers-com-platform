import Link from "next/link";
import { notFound } from "next/navigation";

import { IntakeStatusBadge, RightsStatusBadge } from "@/components/admin/sourcing-status";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import {
  addIntakeToAssessmentSource,
  updateAssessmentSource,
} from "@/lib/admin/assessment-sourcing-actions";
import { loadAssessmentIntakes, loadAssessmentSource } from "@/lib/admin/assessment-sourcing-data";
import { RIGHTS_STATUSES, RIGHTS_STATUS_LABEL } from "@/lib/admin/sourcing";
import { requireRole } from "@/lib/auth/session";
import {
  fieldClassName,
  interactiveLinkClassName,
  interactiveSurfaceClassName,
  textareaClassName,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminAssessmentSourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  await requireRole("admin");
  const source = await loadAssessmentSource(id);
  if (!source) notFound();
  const intakes = await loadAssessmentIntakes(source.id);

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
        <span className="min-w-0">{source.name}</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{source.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact and rights stay here. Each instrument they offer is its own intake.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form
        action={updateAssessmentSource}
        className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <input type="hidden" name="source_id" value={source.id} />
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Name</span>
          <input className={fieldClassName} name="source_name" defaultValue={source.name} required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Contact name</span>
          <input className={fieldClassName} name="contact_name" defaultValue={source.contactName ?? ""} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Contact email</span>
          <input
            className={fieldClassName}
            name="contact_email"
            type="email"
            defaultValue={source.contactEmail ?? ""}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Site</span>
          <input className={fieldClassName} name="channel_url" defaultValue={source.channelUrl ?? ""} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Notes</span>
          <textarea className={textareaClassName} name="source_notes" defaultValue={source.notes ?? ""} />
        </label>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Save researcher
        </Button>
      </form>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold">Instruments</h2>
        </div>
        {intakes.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground sm:px-6">None yet.</p>
        ) : (
          <ul>
            {intakes.map((intake) => (
              <li key={intake.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/assessments/intakes/${intake.id}`}
                  className={cn(
                    "grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6",
                    interactiveSurfaceClassName
                  )}
                >
                  <span className="block truncate font-medium">{intake.title}</span>
                  <span className="flex flex-wrap gap-x-3 text-sm">
                    <RightsStatusBadge status={intake.rightsStatus} />
                    <IntakeStatusBadge status={intake.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        action={addIntakeToAssessmentSource}
        className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <input type="hidden" name="source_id" value={source.id} />
        <h2 className="font-heading text-lg font-semibold">Add another instrument</h2>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input className={fieldClassName} name="title" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Audience</span>
          <input className={fieldClassName} name="audience" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Questions</span>
          <textarea className={textareaClassName} name="questions" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Scoring model</span>
          <textarea className={textareaClassName} name="scoring" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Rights</span>
          <select className={fieldClassName} name="rights_status" defaultValue="inquiry">
            {RIGHTS_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RIGHTS_STATUS_LABEL[status]}
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
