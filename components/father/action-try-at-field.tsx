"use client";

import { saveActionTryAt } from "@/lib/father/actions";
import { fieldClassName } from "@/lib/ui";

export function ActionTryAtField({
  sessionId,
  defaultValue,
  label,
}: {
  sessionId: string;
  defaultValue?: string | null;
  label: string;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        className={fieldClassName}
        type="time"
        name="action_try_at"
        defaultValue={defaultValue ?? "19:00"}
        onBlur={(event) => {
          const value = event.currentTarget.value;
          if (value) void saveActionTryAt(sessionId, value);
        }}
      />
    </label>
  );
}
