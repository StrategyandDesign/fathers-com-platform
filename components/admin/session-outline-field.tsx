"use client";

import { useState } from "react";

import {
  OUTLINE_SESSION_MAX,
  countSessionOutline,
  outlineSessionWarning,
} from "@/lib/admin/sourcing";
import { textareaClassName } from "@/lib/ui";

export function SessionOutlineField({
  name = "outline",
  defaultValue = "",
  placeholder,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const count = countSessionOutline(value);
  const warning = outlineSessionWarning(count);

  return (
    <label className="block space-y-2">
      <span className="text-sm text-muted-foreground">Session outline</span>
      <textarea
        className={textareaClassName}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
      />
      <span className="block text-sm text-muted-foreground">
        {count} of {OUTLINE_SESSION_MAX} short sessions. YouTube links only.
        Check-in and Action are written after the draft opens. A film still
        cannot be published over 6:00.
      </span>
      {warning ? <p className="text-sm text-destructive">{warning}</p> : null}
    </label>
  );
}
