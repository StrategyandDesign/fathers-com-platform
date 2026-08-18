"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useI18n, useT } from "@/components/i18n/locale-provider";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import { dateLocale } from "@/lib/i18n/config";
import { MAX_BULK } from "@/lib/manager/bulk";
import { fieldClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type BulkListParticipant = {
  fatherId: string;
  name: string;
  avatarUrl: string | null;
  groupName: string;
  profileStatus: "completed" | "in_progress" | "not_started";
  progressLabel: string;
  lastActivity: string | null;
  quiet: boolean;
};

export type BulkListTraining = {
  id: string;
  title: string;
  published: boolean;
};

export type BulkListSession = {
  id: string;
  trainingId: string;
  title: string;
  sessionNumber: number;
};

export function ParticipantBulkList({
  participants,
  trainings,
  sessions,
  initialTrainingId,
}: {
  participants: BulkListParticipant[];
  trainings: BulkListTraining[];
  sessions: BulkListSession[];
  initialTrainingId?: string;
}) {
  const t = useT();
  const { locale } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<"assign" | "complete" | "certificates">("assign");
  const [trainingId, setTrainingId] = useState(() => {
    if (initialTrainingId && trainings.some((training) => training.id === initialTrainingId)) {
      return initialTrainingId;
    }
    return trainings[0]?.id ?? "";
  });
  const profileLabel = {
    completed: t("manager.bulk.profileComplete"),
    in_progress: t("manager.bulk.profileInProgress"),
    not_started: t("manager.bulk.profileNeeds"),
  } as const;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allIds = participants.map((row) => row.fatherId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const publishedTrainings = trainings.filter((training) => training.published);
  const trainingOptions = action === "assign" ? publishedTrainings : trainings;
  const effectiveTrainingId = trainingOptions.some((training) => training.id === trainingId)
    ? trainingId
    : (trainingOptions[0]?.id ?? "");
  const scopedSessions = sessions.filter((session) => session.trainingId === effectiveTrainingId);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((row) => row !== id);
      if (current.length >= MAX_BULK) return current;
      return [...current, id];
    });
  }

  function toggleAll() {
    setSelected(allSelected ? [] : allIds.slice(0, MAX_BULK));
  }

  return (
    <div className="space-y-4">
      <form
        method="get"
        action="/manager/participants/bulk"
        className="rounded-xl border border-border bg-card p-4 sm:p-6"
      >
        <h2 className="font-heading text-lg font-semibold">{t("manager.bulk.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("manager.bulk.lead")}
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("manager.bulk.action")}</span>
            <select
              className={fieldClassName}
              name="action"
              value={action}
              onChange={(event) =>
                setAction(event.target.value as "assign" | "complete" | "certificates")
              }
            >
              <option value="assign">{t("manager.bulk.assign")}</option>
              <option value="complete">{t("manager.bulk.complete")}</option>
              <option value="certificates">{t("manager.bulk.certificates")}</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">{t("manager.bulk.training")}</span>
            <select
              className={fieldClassName}
              name="training_id"
              value={effectiveTrainingId}
              onChange={(event) => setTrainingId(event.target.value)}
              required
            >
              {trainingOptions.map((training) => (
                <option key={training.id} value={training.id}>
                  {training.title}
                </option>
              ))}
            </select>
          </label>
          {action === "complete" ? (
            <label className="block space-y-2">
              <span className="text-sm text-muted-foreground">{t("manager.bulk.session")}</span>
              <select className={fieldClassName} name="session_id" defaultValue="">
                <option value="">{t("manager.bulk.entireTraining")}</option>
                {scopedSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {t("manager.bulk.sessionOption", {
                      n: session.sessionNumber,
                      title: session.title,
                    })}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {selected.map((id) => (
          <input key={id} type="hidden" name="father_id" value={id} />
        ))}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {selected.length >= MAX_BULK
              ? t("manager.bulk.selectedMax", { n: selected.length, max: MAX_BULK })
              : t("manager.bulk.selected", { n: selected.length })}
          </p>
          <Button type="submit" disabled={selected.length === 0 || !effectiveTrainingId} className="w-full sm:w-auto">
            {t("manager.bulk.review")}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <ul>
          <li className="hidden items-center gap-3 border-b border-border px-6 py-3 text-xs tracking-wide text-muted-foreground uppercase md:flex">
            <label className="flex w-4 shrink-0 items-center justify-center">
              <span className="sr-only">{t("manager.bulk.selectAll")}</span>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-4 accent-primary"
              />
            </label>
            <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_8rem] gap-2">
              <span>{t("manager.bulk.name")}</span>
              <span>{t("manager.bulk.profileStatus")}</span>
              <span>{t("manager.bulk.currentTraining")}</span>
              <span>{t("manager.bulk.lastActivity")}</span>
            </span>
          </li>
          {participants.map((participant) => {
            const checked = selectedSet.has(participant.fatherId);
            return (
              <li key={participant.fatherId} className="border-b border-border last:border-0">
                <div className="flex items-start gap-3 px-4 py-4 sm:px-6 md:items-center">
                  <label className="flex min-h-11 shrink-0 items-center md:min-h-0">
                    <span className="sr-only">{t("manager.bulk.selectName", { name: participant.name })}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(participant.fatherId)}
                      className="size-4 accent-primary"
                    />
                  </label>
                  <Link
                    href={`/manager/participants/${participant.fatherId}`}
                    className={cn(
                      "grid min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_8rem] md:items-center",
                      interactiveSurfaceClassName
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <UserAvatar
                        name={participant.name}
                        src={participant.avatarUrl}
                        className="size-10 shrink-0 text-xs font-medium md:size-9"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{participant.name}</span>
                          {participant.quiet ? (
                            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                              {t("manager.bulk.quiet")}
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {participant.groupName}
                        </span>
                      </span>
                    </span>
                    <span className="flex justify-between gap-3 pl-[3.25rem] text-sm md:block md:pl-0">
                      <span className="text-muted-foreground md:hidden">{t("manager.bulk.profile")}</span>
                      <span className="text-right text-muted-foreground md:text-left">
                        {profileLabel[participant.profileStatus]}
                      </span>
                    </span>
                    <span className="flex justify-between gap-3 pl-[3.25rem] text-sm md:block md:pl-0">
                      <span className="text-muted-foreground md:hidden">{t("manager.bulk.training")}</span>
                      <span className="text-right md:text-left">{participant.progressLabel}</span>
                    </span>
                    <span className="flex justify-between gap-3 pl-[3.25rem] text-sm md:block md:pl-0">
                      <span className="text-muted-foreground md:hidden">{t("manager.bulk.lastActive")}</span>
                      <span className="text-right text-muted-foreground md:text-left">
                        {participant.lastActivity
                          ? new Date(participant.lastActivity).toLocaleDateString(dateLocale(locale), {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : t("common.emDash")}
                      </span>
                    </span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
