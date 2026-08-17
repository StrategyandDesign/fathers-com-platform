import Link from "next/link";
import { notFound } from "next/navigation";

import { Flash } from "@/components/manager/flash";
import { ManagerNav } from "@/components/manager/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import {
  assignTraining,
  markTrainingComplete,
  sendCertificate,
} from "@/lib/manager/actions";
import { loadManagedParticipant } from "@/lib/manager/data";
import { formatShortDate } from "@/lib/manager/types";

const fieldClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Badge variant={done ? "secondary" : "outline"}>{done ? "Done" : "Open"}</Badge>
      {label}
    </span>
  );
}

export default async function ManagerParticipantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const detail = await loadManagedParticipant(user.id, id);

  if (!detail) {
    notFound();
  }

  const { participant, progress } = detail;
  const unassigned = progress.filter((card) => !card.assigned);
  const withoutCert = progress.filter((card) => !card.certificate);
  const current =
    progress.find((card) => card.assigned && card.current)?.current ??
    progress.find((card) => card.current)?.current ??
    null;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <ManagerNav current="participants" />
        <p className="text-sm text-muted-foreground">
          <Link href="/manager/participants" className="hover:underline">
            Participants
          </Link>
          <span className="px-1.5">/</span>
          {participant.name}
        </p>
        <div>
          <h1 className="font-heading text-2xl font-medium">{participant.name}</h1>
          <p className="text-sm text-muted-foreground">
            {participant.groupName} · Joined {formatShortDate(participant.joinedAt)}
          </p>
        </div>
        <Flash error={flash.error} notice={flash.notice} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Father Profile</CardTitle>
          {participant.profile ? (
            <CardDescription>
              Completed {formatShortDate(participant.profile.taken_at)}
              {participant.profile.primary_edge
                ? ` · Primary Edge: ${participant.profile.primary_edge}`
                : ""}
              {participant.profile.primary_determination
                ? ` · Determination: ${participant.profile.primary_determination}`
                : ""}
            </CardDescription>
          ) : (
            <CardDescription>
              {participant.profileStatus === "in_progress"
                ? "Started, not finished."
                : "Not started."}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Training progress</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {progress.map((card) => {
            const percent =
              card.total === 0 ? 0 : Math.round((card.completed / card.total) * 100);

            return (
              <Card key={card.training.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{card.training.title}</CardTitle>
                    {card.assigned ? <Badge variant="secondary">Assigned</Badge> : null}
                    {card.certificate ? <Badge variant="outline">Certified</Badge> : null}
                  </div>
                  <CardDescription>
                    {card.completed} of {card.total} sessions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {card.certificate ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {card.certificate.serial_number}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Current session</CardTitle>
          {current ? (
            <CardDescription>
              {current.session.title} · Session {current.session.session_number}
            </CardDescription>
          ) : (
            <CardDescription>Every session in the catalog is complete.</CardDescription>
          )}
        </CardHeader>
        {current ? (
          <CardContent className="flex flex-wrap gap-4">
            <Step done={current.progress?.film_completed ?? false} label="Film" />
            <Step done={current.progress?.checkin_completed ?? false} label="Check-in" />
            <Step done={current.progress?.action_completed ?? false} label="Action" />
          </CardContent>
        ) : null}
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <form action={assignTraining}>
            <CardHeader>
              <CardTitle>Assign training</CardTitle>
              <CardDescription>Adds this training to his path.</CardDescription>
            </CardHeader>
            <CardContent>
              <input type="hidden" name="father_id" value={participant.fatherId} />
              {unassigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">All trainings are assigned.</p>
              ) : (
                <select className={fieldClassName} name="training_id" required>
                  {unassigned.map((card) => (
                    <option key={card.training.id} value={card.training.id}>
                      {card.training.title}
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
            {unassigned.length > 0 ? (
              <CardFooter>
                <Button type="submit">Assign Training</Button>
              </CardFooter>
            ) : null}
          </form>
        </Card>

        <Card>
          <form action={markTrainingComplete}>
            <CardHeader>
              <CardTitle>Mark complete</CardTitle>
              <CardDescription>
                Marks every session in that training done.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input type="hidden" name="father_id" value={participant.fatherId} />
              <select className={fieldClassName} name="training_id" required>
                {progress.map((card) => (
                  <option key={card.training.id} value={card.training.id}>
                    {card.training.title}
                    {card.completed === card.total && card.total > 0 ? " (done)" : ""}
                  </option>
                ))}
              </select>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="outline">
                Mark Training Complete
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <form action={sendCertificate}>
            <CardHeader>
              <CardTitle>Send certificate</CardTitle>
              <CardDescription>
                Issues a serial. No PDF yet — placeholder only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input type="hidden" name="father_id" value={participant.fatherId} />
              {withoutCert.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  A certificate is already on file for each training.
                </p>
              ) : (
                <select className={fieldClassName} name="training_id" required>
                  {withoutCert.map((card) => (
                    <option key={card.training.id} value={card.training.id}>
                      {card.training.title}
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
            {withoutCert.length > 0 ? (
              <CardFooter>
                <Button type="submit">Send Certificate</Button>
              </CardFooter>
            ) : null}
          </form>
        </Card>
      </section>
    </div>
  );
}
