import Link from "next/link";

import {
  ActionCommitmentForm,
  ActionDoneForm,
  ActionFinishForm,
} from "@/components/father/action-commitment-form";
import { ActionDisplay } from "@/components/father/action-display";
import type { ActionLoopState, IntentionOption } from "@/lib/father/action-commitment";
import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export async function ActionLoop({
  sessionId,
  sessionTitle,
  skill,
  state,
  changing,
  namedMoment,
  timezone,
  defaultOption,
  defaultDate,
  defaultTime,
  defaultNote,
  skipHref,
  changeHref,
  commitAction,
  doneAction,
  finishAction,
}: {
  sessionId: string;
  sessionTitle?: string | null;
  skill: string;
  state: ActionLoopState;
  changing: boolean;
  namedMoment: string;
  timezone: string;
  defaultOption?: IntentionOption | null;
  defaultDate?: string | null;
  defaultTime?: string | null;
  defaultNote?: string | null;
  skipHref?: string | null;
  changeHref: string;
  commitAction: (formData: FormData) => void | Promise<void>;
  doneAction: (formData: FormData) => void | Promise<void>;
  finishAction: (formData: FormData) => void | Promise<void>;
}) {
  const { t } = await getI18n();
  const showCommit = state === "commit" || changing;

  return (
    <ActionDisplay
      eyebrow={sessionTitle}
      skill={skill}
      footer={
        showCommit && skipHref ? (
          <Link
            href={skipHref}
            className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
          >
            {t("father.session.skipForNow")}
          </Link>
        ) : state === "do" && !changing ? (
          <Link
            href={changeHref}
            className={cn("text-sm text-muted-foreground", interactiveUnderlineClassName)}
          >
            {t("father.session.changeMoment")}
          </Link>
        ) : null
      }
    >
      {showCommit ? (
        <ActionCommitmentForm
          sessionId={sessionId}
          defaultOption={changing ? defaultOption : null}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          timezone={timezone}
          action={commitAction}
        />
      ) : null}

      {state === "do" && !changing ? (
        <div className="space-y-6">
          {namedMoment ? (
            <p className="text-sm text-muted-foreground">{namedMoment}</p>
          ) : null}
          <ActionDoneForm sessionId={sessionId} action={doneAction} />
        </div>
      ) : null}

      {state === "finish" ? (
        <ActionFinishForm
          sessionId={sessionId}
          defaultNote={defaultNote}
          action={finishAction}
        />
      ) : null}
    </ActionDisplay>
  );
}
