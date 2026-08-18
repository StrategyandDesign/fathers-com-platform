"use client";

import { useState } from "react";

import type { AdminReleaseTarget } from "@/lib/admin/types";
import { checkboxOptionClassName, radioOptionClassName } from "@/lib/ui";

function reviewLabel(status: AdminReleaseTarget["reviewStatus"]) {
  if (status === "pending") return "Pending review";
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  return "Not sent";
}

export function ReleaseTargets({
  organizations,
  defaultScope = "all",
  noun = "training",
}: {
  organizations: AdminReleaseTarget[];
  defaultScope?: "all" | "selected";
  noun?: "training" | "assessment";
}) {
  const [scope, setScope] = useState<"all" | "selected">(defaultScope);

  if (organizations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {noun === "assessment"
          ? "Create an organization first. Release sends this assessment to the Leaders you choose."
          : "Create an organization first. Release sends this training to the Leaders you choose."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Send to</p>
      <label className={radioOptionClassName}>
        <input
          type="radio"
          name="release_scope"
          value="all"
          checked={scope === "all"}
          onChange={() => setScope("all")}
          className="size-4 accent-primary"
        />
        <span>All organizations</span>
      </label>
      <label className={radioOptionClassName}>
        <input
          type="radio"
          name="release_scope"
          value="selected"
          checked={scope === "selected"}
          onChange={() => setScope("selected")}
          className="size-4 accent-primary"
        />
        <span>Selected organizations</span>
      </label>

      {scope === "selected" ? (
        <div className="space-y-1 rounded-lg border border-border px-3 py-2">
          {organizations.map((org) => (
            <label key={org.id} className={checkboxOptionClassName}>
              <input
                type="checkbox"
                name="group_id"
                value={org.id}
                defaultChecked={!org.reviewStatus || org.reviewStatus === "declined"}
                className="size-4 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{org.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {reviewLabel(org.reviewStatus)}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every organization with a Leader will get this for review.
        </p>
      )}
    </div>
  );
}

export function ReleaseTargetStatusList({
  organizations,
}: {
  organizations: AdminReleaseTarget[];
}) {
  if (organizations.length === 0) return null;

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {organizations.map((org) => (
        <li
          key={org.id}
          className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm"
        >
          <span className="min-w-0 truncate font-medium">{org.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {reviewLabel(org.reviewStatus)}
          </span>
        </li>
      ))}
    </ul>
  );
}
