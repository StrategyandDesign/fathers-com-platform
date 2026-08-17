import Link from "next/link";

import { CopyButton } from "@/components/manager/copy-button";
import { Flash } from "@/components/manager/flash";
import { ManagerNav } from "@/components/manager/nav";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createGroup } from "@/lib/manager/actions";
import { loadManagerWorkspace } from "@/lib/manager/data";

const fieldClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function ManagerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { groups, summary, needsAttention } = await loadManagerWorkspace(user.id);

  const stats = [
    { label: "Active Participants", value: summary.activeParticipants },
    { label: "Profiles Completed", value: summary.profilesCompleted },
    { label: "Sessions Completed", value: summary.sessionsCompleted },
    { label: "Trainings Completed", value: summary.trainingsCompleted },
    { label: "Pending Actions", value: summary.pendingActions },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <ManagerNav current="dashboard" />
        <div>
          <h1 className="font-heading text-2xl font-medium">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your group’s progress. Fathers join with the invite code.
          </p>
        </div>
        <Flash error={params.error} notice={params.notice} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Group invite code</CardTitle>
          <CardDescription>
            Fathers enter this code when they create an account.
          </CardDescription>
        </CardHeader>
        {groups.length > 0 ? (
          <CardContent className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col gap-3 rounded-lg border border-input px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="font-mono text-sm tracking-wide">{group.invite_code}</p>
                </div>
                <CopyButton value={group.invite_code} />
              </div>
            ))}
          </CardContent>
        ) : (
          <form action={createGroup}>
            <CardContent className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Group name</span>
                <input
                  className={fieldClassName}
                  name="name"
                  defaultValue="Pilot Group"
                  required
                />
              </label>
            </CardContent>
            <CardFooter>
              <Button type="submit">Create group</Button>
            </CardFooter>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
          <CardDescription>
            Profile gaps, unfinished sessions, and certificates ready to send.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting right now.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {needsAttention.map((item) => (
                <li key={`${item.fatherId}-${item.reason}`}>
                  <Link
                    href={`/manager/participants/${item.fatherId}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50"
                  >
                    <span>
                      <span className="font-medium">{item.name}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {item.reason}
                      </span>
                    </span>
                    <Badge variant="outline">Open</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <Link href="/manager/participants" className={buttonVariants({ variant: "outline" })}>
            View all participants
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
