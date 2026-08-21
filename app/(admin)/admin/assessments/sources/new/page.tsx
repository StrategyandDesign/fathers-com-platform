import Link from "next/link";

import { bringInAssessment } from "@/lib/admin/assessment-sourcing-actions";
import { loadAssessmentSources } from "@/lib/admin/assessment-sourcing-data";
import { RIGHTS_STATUSES, RIGHTS_STATUS_LABEL } from "@/lib/admin/sourcing";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { checkboxOptionClassName, fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

export default async function AdminBringInAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");
  const sources = await loadAssessmentSources();

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
        <span>New</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Bring in an assessment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name the researcher, record whether you may use their instrument,
          then paste the questions and the scoring key. Opening a draft stores
          those as one compiled model, the same way Keystone keeps questions
          separate from the scoring function.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form action={bringInAssessment} className="max-w-2xl space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Who it comes from</h2>
          <p className="text-sm text-muted-foreground">
            Pick someone you already recorded, or name a new researcher or lab.
          </p>
          {sources.length > 0 ? (
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">Existing researcher</span>
              <select className={fieldClassName} name="source_id" defaultValue="">
                <option value="">New researcher</option>
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
              placeholder="If you are adding a new researcher"
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
            <span className="text-sm text-muted-foreground">Site</span>
            <input className={fieldClassName} name="channel_url" placeholder="https://" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Notes about this researcher</span>
            <textarea className={textareaClassName} name="source_notes" />
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">The instrument</h2>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Title</span>
            <input className={fieldClassName} name="title" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Audience</span>
            <input className={fieldClassName} name="audience" placeholder="Who this is for" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Description</span>
            <textarea className={textareaClassName} name="description" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Questions</span>
            <textarea
              className={textareaClassName}
              name="questions"
              placeholder={"Involvement | I stay in my child's life\nInvolvement | - I wait for them to reach me\nPresence | When we talk, I give them my attention"}
            />
            <span className="block text-sm text-muted-foreground">
              One question per line: Dimension | prompt. A leading minus marks a
              reverse-keyed item. Answers stay as the father chose them. The
              model flips those items when it scores.
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Scoring model</span>
            <textarea
              className={textareaClassName}
              name="scoring"
              placeholder={"method: sum\nscale: 1-5\noutcome: highest\nInvolvement: You stay in their life\nPresence: You give them your attention"}
            />
            <span className="block text-sm text-muted-foreground">
              Optional. Default is a 1-5 sum and the highest dimension. Use
              outcome: bands Presence and lines like 0-39 Distant when the
              researcher sent cut scores instead of a typology.
            </span>
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Rights</h2>
          <p className="text-sm text-muted-foreground">
            First release is blocked until this is marked Cleared. Do not
            release an instrument you do not have permission to use.
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
