import Link from "next/link";

import { createTraining } from "@/lib/admin/actions";
import { LEADER_SUMMARY_MAX } from "@/lib/admin/development";
import { Flash } from "@/components/manager/flash";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth/session";
import { checkboxOptionClassName, fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

export default async function AdminNewTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  await requireRole("admin");

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/trainings" className={interactiveLinkClassName}>
          Trainings
        </Link>
        <span className="text-white/20">|</span>
        <span>New</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">New training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Created as a draft idea. Add sessions next, Stage the Father path,
          then mark Ready. Publishing does not notify Leaders. Release is a
          separate step, and only Released trainings enter accept/decline.
          To bring work from someone outside the platform, use Bring in a
          training.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <form action={createTraining} className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <input
            className={fieldClassName}
            name="title"
            required
            aria-invalid={Boolean(flash.error) || undefined}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Slug (optional)</span>
          <input className={fieldClassName} name="slug" placeholder="auto-from-title" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Working title (optional)</span>
          <input
            className={fieldClassName}
            name="working_title"
            maxLength={120}
            placeholder="Internal name. Fathers still see Title."
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea className={textareaClassName} name="description" />
          <span className="block text-sm text-muted-foreground">
            Short catalog blurb. Leaders see this on the training card.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Training Summary</span>
          <textarea
            className={textareaClassName}
            name="leader_summary"
            maxLength={LEADER_SUMMARY_MAX}
            rows={8}
            placeholder="The complete summary the leader reads first."
          />
          <span className="block text-sm text-muted-foreground">
            This is what the leader (Org Manager) reads before the session
            information or films.
          </span>
          <span className="block text-sm text-muted-foreground">
            After you create the training, attach PDFs on the edit page. PDF
            only, 5 MB each, up to 3.
          </span>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Development notes</span>
          <textarea
            className={textareaClassName}
            name="development_notes"
            maxLength={4000}
            placeholder="Super-admin only. Early ideas, gaps, next sitting."
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Catalog order</span>
          <input className={fieldClassName} name="order_index" type="number" defaultValue={0} />
        </label>
        <label className={checkboxOptionClassName}>
          <input
            type="checkbox"
            name="published"
            value="true"
            className="size-4 accent-primary"
          />
          <span>Published (catalog flag only, still not released to Leaders)</span>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="w-full sm:w-auto">
            Create training
          </Button>
          <Link
            href="/admin/trainings/sources/new"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            Bring in a training
          </Link>
        </div>
      </form>
    </div>
  );
}
