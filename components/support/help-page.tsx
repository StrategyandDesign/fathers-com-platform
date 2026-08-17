import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import { SupportReportForm } from "@/components/support/report-form";
import { ROLE_HOME } from "@/lib/auth/roles";
import {
  SUPPORT_HOME_LABEL,
  type SupportSubmitterRole,
} from "@/lib/support/types";
import { interactiveLinkClassName } from "@/lib/ui";

export function SupportHelpPage({
  role,
  error,
  notice,
}: {
  role: SupportSubmitterRole;
  error?: string;
  notice?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href={ROLE_HOME[role]} className={interactiveLinkClassName}>
          {SUPPORT_HOME_LABEL[role]}
        </Link>
        <span className="text-white/20">|</span>
        <span>Help</span>
      </p>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Report a Problem
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what happened. We read every note — no ticket number, no chat.
        </p>
      </div>
      <Flash error={error} notice={notice} />
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <SupportReportForm />
      </section>
    </div>
  );
}
