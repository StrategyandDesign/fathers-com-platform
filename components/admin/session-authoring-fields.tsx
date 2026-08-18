import { skillPromptFields } from "@/lib/admin/development";
import { adminDurationHint } from "@/components/admin/film-flags";
import type { Session } from "@/lib/father/types";
import { fieldClassName, textareaClassName } from "@/lib/ui";

export function SessionAuthoringFields({
  session,
  nextNumber,
}: {
  session?: Session;
  nextNumber?: number;
}) {
  const checkin = skillPromptFields(session?.checkin_prompt);
  const action = skillPromptFields(session?.action_prompt);
  const sessionNumber = session?.session_number ?? nextNumber ?? 1;
  const orderIndex = session?.order_index ?? nextNumber ?? sessionNumber;

  return (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">Title</span>
        <input
          className={fieldClassName}
          name="title"
          defaultValue={session?.title ?? ""}
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Session number</span>
          <input
            className={fieldClassName}
            name="session_number"
            type="number"
            min={1}
            defaultValue={sessionNumber}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">Order</span>
          <input
            className={fieldClassName}
            name="order_index"
            type="number"
            defaultValue={orderIndex}
          />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">Short description</span>
        <input
          className={fieldClassName}
          name="keyline"
          defaultValue={session?.keyline ?? ""}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">YouTube URL</span>
        <input
          className={fieldClassName}
          name="video_url"
          defaultValue={session?.video_url ?? ""}
          placeholder="https://youtu.be/… or youtube.com/watch?v=…"
        />
        <span className="block text-xs text-muted-foreground">
          A YouTube watch, share, Shorts, or youtu.be link. Playlists will not
          play. You can save without a film while this is a draft.
        </span>
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">Runtime</span>
        <input
          className={fieldClassName}
          name="duration_seconds"
          defaultValue={session?.duration_seconds ?? ""}
          inputMode="numeric"
          placeholder="seconds or m:ss"
        />
        <span className="block text-xs text-muted-foreground">
          {adminDurationHint(session?.duration_seconds)} Filled from YouTube when
          a server key is configured.
        </span>
      </label>
      <SkillPromptFields
        prefix="checkin"
        heading="Check-in"
        hint="One skill question with three options. Fathers still answer a single Check-in."
        values={checkin}
      />
      <SkillPromptFields
        prefix="action"
        heading="Action"
        hint="One Action with three options. Completing Action still completes the session."
        values={action}
      />
    </div>
  );
}

function SkillPromptFields({
  prefix,
  heading,
  hint,
  values,
}: {
  prefix: "checkin" | "action";
  heading: string;
  hint: string;
  values: { stem: string; a: string; b: string; c: string };
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border bg-black/20 p-3 sm:p-4">
      <legend className="px-1 text-sm font-medium">{heading}</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <label className="block space-y-2">
        <span className="text-sm text-muted-foreground">Question</span>
        <textarea
          className={textareaClassName}
          name={`${prefix}_stem`}
          defaultValue={values.stem}
          rows={3}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">A</span>
          <input className={fieldClassName} name={`${prefix}_a`} defaultValue={values.a} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">B</span>
          <input className={fieldClassName} name={`${prefix}_b`} defaultValue={values.b} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted-foreground">C</span>
          <input className={fieldClassName} name={`${prefix}_c`} defaultValue={values.c} />
        </label>
      </div>
    </fieldset>
  );
}
