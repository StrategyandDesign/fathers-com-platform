import Link from "next/link";

import { createTraining } from "@/lib/admin/actions";
import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { fieldClassName, interactiveLinkClassName, textareaClassName } from "@/lib/ui";

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
          Add sessions on the next page. Leave unpublished until it is ready.
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
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea className={textareaClassName} name="description" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Catalog order</span>
          <input className={fieldClassName} name="order_index" type="number" defaultValue={0} />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg text-sm outline-none transition-colors duration-150 ease-out hover:bg-white/5 focus-within:ring-3 focus-within:ring-ring/50 active:opacity-90">
          <input
            type="checkbox"
            name="published"
            value="true"
            defaultChecked
            className="size-4 accent-primary"
          />
          <span>Published (visible for new assignment)</span>
        </label>
        <Button type="submit" className="w-full sm:w-auto">
          Create training
        </Button>
      </form>
    </div>
  );
}
