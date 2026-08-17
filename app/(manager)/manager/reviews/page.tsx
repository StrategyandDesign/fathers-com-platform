import Link from "next/link";

import { Flash } from "@/components/manager/flash";
import {
  ReviewDecisionForms,
  ReviewStatusBadge,
} from "@/components/manager/review-decision-forms";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";
import { loadReviewQueue } from "@/lib/manager/reviews";
import { formatShortDate } from "@/lib/manager/types";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

function sessionLabel(count: number) {
  return count === 1 ? "1 session" : `${count} sessions`;
}

export default async function ManagerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireRole("manager");
  const { pending, history, unread, groups } = await loadReviewQueue(user.id);

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/manager" className={interactiveLinkClassName}>
          Dashboard
        </Link>
        <span className="text-white/20">|</span>
        <span>New trainings</span>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            New trainings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview a release, then accept to make it available to assign — or
            decline to keep it hidden from {groups[0]?.name ?? "your organization"}.
          </p>
        </div>
        <Link
          href="/manager/request"
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          Request a Training
        </Link>
      </div>
      <Flash error={params.error} notice={params.notice} />

      {unread.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread.length === 1
              ? "One training is waiting on your review."
              : `${unread.length} trainings are waiting on your review.`}
          </p>
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {unread.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn("block px-4 py-3", interactiveSurfaceClassName)}
                >
                  <span className="block font-medium">{item.title}</span>
                  {item.body ? (
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {item.body}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Pending review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accepted trainings appear in Assign Training. Nothing is sent to
            fathers automatically.
          </p>
        </div>
        {pending.length === 0 ? (
          <EmptyState title="You’re caught up">
            No new trainings are waiting. Decisions you already made stay in
            the history below.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <article
                key={`${item.review.group_id}-${item.training.id}`}
                className="rounded-xl border border-border bg-card p-4 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-semibold">
                      {item.training.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sessionLabel(item.sessionCount)}
                      {groups.length > 1 ? ` · ${item.groupName}` : ""}
                    </p>
                  </div>
                  <ReviewStatusBadge status={item.review.status} />
                </div>
                {item.training.description ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {item.training.description}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/manager/reviews/${item.training.id}?group=${item.review.group_id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                  >
                    Preview
                  </Link>
                </div>
                <div className="mt-5 border-t border-border pt-5">
                  <ReviewDecisionForms
                    trainingId={item.training.id}
                    groupId={item.review.group_id}
                    status={item.review.status}
                    returnTo="queue"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Decision history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A simple log of trainings you accepted or declined for{" "}
            {groups[0]?.name ?? "your organization"}.
          </p>
        </div>
        {history.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-5 sm:px-6">
            <p className="text-sm text-muted-foreground">No decisions yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {history.map((item) => {
              const href = item.training.released_at
                ? `/manager/reviews/${item.training.id}?group=${item.review.group_id}`
                : null;
              const canReverse =
                item.review.status === "declined" && Boolean(item.training.released_at);

              return (
                <li
                  key={`${item.review.group_id}-${item.training.id}`}
                  className="px-4 py-4 sm:px-6"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="min-w-0">
                      {href && !canReverse ? (
                        <Link href={href} className={cn("block font-medium", interactiveLinkClassName)}>
                          {item.training.title}
                        </Link>
                      ) : (
                        <span className="block font-medium">{item.training.title}</span>
                      )}
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {formatShortDate(item.review.decided_at)}
                        {groups.length > 1 ? ` · ${item.groupName}` : ""}
                      </span>
                    </span>
                    <ReviewStatusBadge status={item.review.status} />
                  </div>
                  {item.review.status === "declined" && item.review.decline_reason ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.review.decline_reason}
                    </p>
                  ) : null}
                  {canReverse ? (
                    <div className="mt-4 border-t border-border pt-4">
                      {href ? (
                        <Link
                          href={href}
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "mb-4 w-full sm:w-auto"
                          )}
                        >
                          Preview
                        </Link>
                      ) : null}
                      <ReviewDecisionForms
                        trainingId={item.training.id}
                        groupId={item.review.group_id}
                        status={item.review.status}
                        returnTo="queue"
                        declineReason={item.review.decline_reason}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
