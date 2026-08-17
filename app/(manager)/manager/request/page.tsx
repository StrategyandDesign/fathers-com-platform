import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { TrainingRequestForm } from "@/components/training-requests/request-form";
import { requireRole } from "@/lib/auth/session";
import { loadManagerGroups } from "@/lib/manager/data";
import { interactiveLinkClassName } from "@/lib/ui";

export default async function ManagerTrainingRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const groups = await loadManagerGroups(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager" className={interactiveLinkClassName}>
          Dashboard
        </Link>
        <span className="text-white/20">|</span>
        <span>Request a Training</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Request a Training
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suggest a topic we should source for your organization. No tracking —
          we’ll take it from here.
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <TrainingRequestForm
          groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        />
      </section>
    </div>
  );
}
