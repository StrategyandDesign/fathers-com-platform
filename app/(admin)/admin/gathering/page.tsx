import Link from "next/link";

import { loadAdminGathering } from "@/lib/admin/gathering";
import { requireRole } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/i18n/server";
import { EmptyState } from "@/components/ui/empty-state";
import { interactiveLinkClassName } from "@/lib/ui";

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg border border-border bg-black/30 px-3 py-3">
      <p className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
    </div>
  );
}

function StackedBar({
  notStarted,
  inProgress,
  completed,
}: {
  notStarted: number;
  inProgress: number;
  completed: number;
}) {
  const total = notStarted + inProgress + completed;
  if (total === 0) {
    return <div className="h-1.5 rounded-full bg-white/10" />;
  }
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full bg-primary" style={{ width: `${(completed / total) * 100}%` }} />
      <div className="h-full bg-primary/50" style={{ width: `${(inProgress / total) * 100}%` }} />
      <div
        className="h-full bg-foreground/15"
        style={{ width: `${(notStarted / total) * 100}%` }}
      />
    </div>
  );
}

function Waiting({ role, optedIn, needed }: { role: string; optedIn: number; needed: number }) {
  return (
    <p className="text-sm text-muted-foreground">
      {optedIn === 0
        ? `No ${role} have turned sharing on yet. Counts stay hidden until at least ${needed} share.`
        : `${optedIn} ${role} sharing. Counts stay hidden until at least ${needed} share, so one person cannot be read from the totals.`}
    </p>
  );
}

function cellLabel(value: number | null) {
  return value ?? "—";
}

export default async function AdminGatheringPage() {
  await requireRole("admin");
  const gathering = await loadAdminGathering();
  const { fathers, managers, reviewers, minCohort } = gathering;

  if (gathering.unavailable) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Gathering</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Anonymous participation from people who chose to share it.
          </p>
        </div>
        <EmptyState title="Gathering unavailable">
          Anonymous counts could not load. Try again later. Sharing stays off
          for everyone until this page can read the totals.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Gathering</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Anonymous participation from people who chose to share it. No names,
          emails, notes, answers, or certificate serials. Each person turns this
          on in Account. Totals that would describe fewer than {minCohort}{" "}
          people stay hidden.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Fathers sharing"
          value={`${fathers.optedIn} of ${fathers.eligible}`}
        />
        <Stat
          label="Managers sharing"
          value={`${managers.optedIn} of ${managers.eligible}`}
        />
        <Stat
          label="Reviewers sharing"
          value={`${reviewers.optedIn} of ${reviewers.eligible}`}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Father participants</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Training, session, assessment, and certificate counts from fathers
            who opted in.
          </p>
        </div>
        {fathers.ready ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Started" value={fathers.started} />
              <Stat label="Finished a session" value={fathers.completedOneSession} />
              <Stat label="Trainings completed" value={fathers.trainingsCompleted} />
              <Stat label="Sessions completed" value={fathers.sessionsCompleted} />
              <Stat label="Certificates" value={fathers.certificates} />
              <Stat label="Assessments finished" value={fathers.assessmentsCompleted} />
              <Stat label="Profiles finished" value={fathers.profilesCompleted} />
            </div>
            {fathers.trainingDistribution.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Assigned trainings</h3>
                <ul className="space-y-3">
                  {fathers.trainingDistribution.map((row) => {
                    const barReady =
                      row.notStarted != null &&
                      row.inProgress != null &&
                      row.completed != null;
                    return (
                      <li key={row.title} className="space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium">{row.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {cellLabel(row.completed)} complete ·{" "}
                            {cellLabel(row.inProgress)} in progress ·{" "}
                            {cellLabel(row.notStarted)} not started
                          </p>
                        </div>
                        {barReady ? (
                          <StackedBar
                            notStarted={row.notStarted ?? 0}
                            inProgress={row.inProgress ?? 0}
                            completed={row.completed ?? 0}
                          />
                        ) : (
                          <div className="h-1.5 rounded-full bg-white/10" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assigned trainings in this share set yet.
              </p>
            )}
            {fathers.completionTrend.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sessions completed, by week</h3>
                <ul className="space-y-1 text-sm">
                  {fathers.completionTrend.map((point) => (
                    <li
                      key={point.week}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-muted-foreground">
                        Week of {formatShortDate(point.week, "en")}
                      </span>
                      <span className="tabular-nums">{point.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <Waiting role="fathers" optedIn={fathers.optedIn} needed={minCohort} />
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Managers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assignments, certificates issued, and review decisions from managers
            who opted in. Organizations stay unnamed.
          </p>
        </div>
        {managers.ready ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Assignments" value={managers.assignments} />
            <Stat label="Certificates issued" value={managers.certificatesIssued} />
            <Stat label="Reviews accepted" value={managers.reviewsAccepted} />
            <Stat label="Reviews declined" value={managers.reviewsDeclined} />
            <Stat label="Reviews pending" value={managers.reviewsPending} />
          </div>
        ) : (
          <Waiting role="managers" optedIn={managers.optedIn} needed={minCohort} />
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div>
          <h2 className="font-heading text-lg font-semibold">Reviewers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Whether opted-in reviewers watch the whole network or one
            organization. No organization names.
          </p>
        </div>
        {reviewers.ready ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Network scope" value={reviewers.unscoped} />
            <Stat label="One-organization scope" value={reviewers.scoped} />
          </div>
        ) : (
          <Waiting role="reviewers" optedIn={reviewers.optedIn} needed={minCohort} />
        )}
      </section>

      {fathers.optedIn + managers.optedIn + reviewers.optedIn === 0 ? (
        <EmptyState title="Waiting on consent">
          Gathering stays empty until a father, manager, or reviewer turns on
          anonymous sharing in Account. Super-admins do not turn it on for them.
        </EmptyState>
      ) : null}

      <p className="text-sm text-muted-foreground">
        People change this on{" "}
        <Link href="/admin/account" className={interactiveLinkClassName}>
          their own Account
        </Link>
        . Super-admin Account does not share, because this tab is the receiving
        side.
      </p>
    </div>
  );
}
