import Link from "next/link";

import { ManagerNav } from "@/components/manager/nav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { loadManagerWorkspace } from "@/lib/manager/data";
import { formatShortDate } from "@/lib/manager/types";

const PROFILE_LABEL = {
  completed: "Profile complete",
  in_progress: "Profile in progress",
  not_started: "Profile not started",
} as const;

export default async function ManagerParticipantsPage() {
  const { user } = await requireRole("manager");
  const { participants } = await loadManagerWorkspace(user.id);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <ManagerNav current="participants" />
        <div>
          <h1 className="font-heading text-2xl font-medium">Participants</h1>
          <p className="text-sm text-muted-foreground">
            Fathers in your group. Open anyone to assign a training or send a
            certificate.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
          <CardDescription>
            {participants.length === 0
              ? "No one has joined yet. Share your invite code from the dashboard."
              : `${participants.length} father${participants.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? null : (
            <ul className="divide-y rounded-lg border">
              {participants.map((participant) => (
                <li key={participant.fatherId}>
                  <Link
                    href={`/manager/participants/${participant.fatherId}`}
                    className="flex flex-col gap-2 px-3 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {participant.groupName} · {participant.progressLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          participant.profileStatus === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {PROFILE_LABEL[participant.profileStatus]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Last activity {formatShortDate(participant.lastActivity)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
