"use client";

import { useMemo, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { sendNudgePanelNotes } from "@/lib/manager/nudge-panel-actions";
import type { NudgePanelView } from "@/lib/manager/nudge-panel";
import { initials } from "@/lib/ui";
import { Button } from "@/components/ui/button";

type RowState = {
  status: "idle" | "confirm" | "sending" | "sent" | "queued" | "cannot_reach" | "failed";
  sentAt?: string;
};

function formatStamp(value: string | undefined) {
  if (!value) return "";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NudgePanel({ panel }: { panel: NudgePanelView }) {
  const t = useT();
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reachable = useMemo(
    () => panel.rows.filter((row) => row.canReach && (states[row.fatherId]?.status ?? "idle") === "idle"),
    [panel.rows, states]
  );

  function setRow(fatherId: string, next: RowState) {
    setStates((current) => ({ ...current, [fatherId]: next }));
  }

  async function send(ids: string[]) {
    setError(null);
    const result = await sendNudgePanelNotes(ids);
    if (!result.ok && result.error) {
      setError(result.error);
    }
    for (const item of result.results) {
      if (item.status === "sent" || item.status === "queued" || item.status === "cannot_reach") {
        setRow(item.fatherId, { status: item.status, sentAt: item.sentAt });
      } else if (item.status === "cooldown") {
        setRow(item.fatherId, { status: "sent", sentAt: item.sentAt });
      } else {
        setRow(item.fatherId, { status: "failed" });
      }
    }
    return result;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">{t("manager.nudgePanel.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("manager.nudgePanel.lead")}</p>

      {panel.rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{t("manager.nudgePanel.empty")}</p>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {panel.rows.map((row) => {
            const state = states[row.fatherId] ?? { status: row.canReach ? "idle" : "cannot_reach" };
            const done = state.status === "sent" || state.status === "queued";
            const reviewing = state.status === "confirm" || state.status === "sending";
            return (
              <li key={row.fatherId} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                    {initials(row.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.name}</p>
                    {done ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {state.status === "queued" ? t("manager.nudgePanel.queued") : t("manager.nudgePanel.sent")}
                        {state.sentAt ? ` ${formatStamp(state.sentAt)}` : ""}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-muted-foreground">{row.context}</p>
                        {reviewing ? (
                          <div className="mt-3 space-y-3 rounded-lg border border-border bg-black/30 px-4 py-3">
                            <p className="text-sm text-muted-foreground">{t("manager.nudgePanel.youConfirm")}</p>
                            <div dir={row.dir} className="space-y-1">
                              <p className="text-sm font-medium">{row.title}</p>
                              <p className="text-sm text-muted-foreground">{row.body}</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                variant="secondary"
                                className="w-full sm:w-auto"
                                disabled={state.status === "sending"}
                                onClick={async () => {
                                  setRow(row.fatherId, { status: "sending" });
                                  await send([row.fatherId]);
                                }}
                              >
                                {state.status === "sending"
                                  ? t("common.saving")
                                  : t("manager.nudgePanel.confirmSend")}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full sm:w-auto"
                                onClick={() => setRow(row.fatherId, { status: "idle" })}
                              >
                                {t("common.cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : row.canReach ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              setBulkOpen(false);
                              setRow(row.fatherId, { status: "confirm" });
                            }}
                          >
                            {t("manager.nudgePanel.sendNote")}
                          </Button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title={t("manager.nudgePanel.cannotReachHint")}
                            aria-label={`${t("manager.nudgePanel.cannotReach")}. ${t("manager.nudgePanel.cannotReachHint")}`}
                            className="mt-3 cursor-not-allowed text-sm text-muted-foreground"
                          >
                            {t("manager.nudgePanel.cannotReach")}
                          </button>
                        )}
                        {state.status === "failed" ? (
                          <p className="mt-2 text-sm text-muted-foreground">{t("manager.nudgePanel.error")}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {panel.hiddenCount > 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("manager.nudgePanel.andMore", { count: panel.hiddenCount })}
        </p>
      ) : null}

      {reachable.length > 1 ? (
        <div className="mt-5 space-y-3">
          {bulkOpen ? (
            <div className="space-y-4 rounded-lg border border-border bg-black/30 px-4 py-4">
              <p className="text-sm text-muted-foreground">{t("manager.nudgePanel.youConfirm")}</p>
              <ul className="space-y-4">
                {reachable.map((row) => (
                  <li key={row.fatherId} className="space-y-1">
                    <p className="font-medium">{row.name}</p>
                    <div dir={row.dir}>
                      <p className="text-sm">{row.title}</p>
                      <p className="text-sm text-muted-foreground">{row.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={bulkSending}
                  onClick={async () => {
                    setBulkSending(true);
                    for (const row of reachable) setRow(row.fatherId, { status: "sending" });
                    await send(reachable.map((row) => row.fatherId));
                    setBulkSending(false);
                    setBulkOpen(false);
                  }}
                >
                  {t("manager.nudgePanel.confirmSendAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  disabled={bulkSending}
                  onClick={() => setBulkOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setBulkOpen(true);
                setStates((current) => {
                  const next = { ...current };
                  for (const row of panel.rows) {
                    if (next[row.fatherId]?.status === "confirm") next[row.fatherId] = { status: "idle" };
                  }
                  return next;
                });
              }}
            >
              {t("manager.nudgePanel.sendToAll", { count: reachable.length })}
            </Button>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-muted-foreground">{error}</p> : null}
    </section>
  );
}
