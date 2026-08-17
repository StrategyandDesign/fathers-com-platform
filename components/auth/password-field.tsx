"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { authFieldClassName, interactiveIconClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function PasswordField({
  autoComplete,
  invalid,
  minLength,
  defaultVisible = false,
}: {
  autoComplete: string;
  invalid?: boolean;
  minLength?: number;
  defaultVisible?: boolean;
}) {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div className="relative">
      <input
        className={cn(authFieldClassName, "pr-12")}
        type={visible ? "text" : "password"}
        name="password"
        autoComplete={autoComplete}
        minLength={minLength}
        required
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className={cn(
          "absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground",
          interactiveIconClassName
        )}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" strokeWidth={1.6} /> : <Eye className="size-4" strokeWidth={1.6} />}
      </button>
    </div>
  );
}
