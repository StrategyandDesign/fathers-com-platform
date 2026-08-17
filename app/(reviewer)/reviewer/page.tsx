import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { loadReviewerInsights } from "@/lib/reviewer/insights";

function formatWeek(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const percent = max <= 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={className ?? "h-full rounded-full bg-primary"}
        style={{ width: `${percent}%` }}
      />
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
    return <div className="h-2 rounded-full bg-muted" />;
  }

  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-primary"
        style={{ width: `${(completed / total) * 100}%` }}
      />
      <div
        className="h-full bg-primary/50"
        style={{ width: `${(inProgress / total) * 100}%` }}
      />
      <div
        className="h-full bg-foreground/15"
        style={{ width: `${(notStarted / total) * 100}%` }}
      />
    </div>
  );
}

export default async function ReviewerInsightsPage() {
  await requireRole("reviewer");
  const insights = await loadReviewerInsights();
  const trendMax = Math.max(1, ...insights.completion_trend.map((point) => point.count));
  const edgeMax = Math.max(1, ...insights.primary_edges.map((edge) => edge.count));

  const stats = [
    { label: "Total Participants", value: String(insights.total_participants) },
    {
      label: "Profiles Completed",
      value: `${insights.profiles_completed_pct}%`,
      detail: `${insights.profiles_completed} of ${insights.total_participants}`,
    },
    {
      label: "Average Sessions Completed",
      value: insights.average_sessions_completed.toFixed(1),
    },
    { label: "Trainings Completed", value: String(insights.trainings_completed) },
    { label: "Active Groups", value: String(insights.active_groups) },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="font-heading text-2xl font-medium">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Cohort totals only. No names, emails, or individual records.
          </p>
        </div>
        <p className="rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm">
          All data is anonymized and aggregated.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
              {"detail" in stat && stat.detail ? (
                <CardDescription>{stat.detail}</CardDescription>
              ) : null}
            </CardHeader>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile completion trend</CardTitle>
            <CardDescription>Weekly Profile completions, last six weeks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.completion_trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weekly totals yet.</p>
            ) : (
              insights.completion_trend.map((point) => (
                <div key={point.week} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatWeek(point.week)}</span>
                    <span className="tabular-nums text-muted-foreground">{point.count}</span>
                  </div>
                  <Bar value={point.count} max={trendMax} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most common Primary Edges</CardTitle>
            <CardDescription>Counts from completed Profiles only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.primary_edges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Primary Edge totals yet.
              </p>
            ) : (
              insights.primary_edges.map((edge) => (
                <div key={edge.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{edge.label}</span>
                    <span className="tabular-nums text-muted-foreground">{edge.count}</span>
                  </div>
                  <Bar value={edge.count} max={edgeMax} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Training progress distribution</CardTitle>
          <CardDescription>
            How the cohort sits in each training. Complete, in progress, not started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {insights.training_distribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trainings in the catalog yet.</p>
          ) : (
            insights.training_distribution.map((training) => {
              const total =
                training.not_started + training.in_progress + training.completed;
              return (
                <div key={training.title} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{training.title}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {total} participant{total === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StackedBar
                    notStarted={training.not_started}
                    inProgress={training.in_progress}
                    completed={training.completed}
                  />
                  <p className="text-xs text-muted-foreground">
                    {training.completed} complete · {training.in_progress} in
                    progress · {training.not_started} not started
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
