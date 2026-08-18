import { Flash } from "@/components/manager/flash";
import { Button } from "@/components/ui/button";
import { homePrimaryCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export function StartScreen({
  title,
  body,
  error,
  children,
}: {
  title: string;
  body?: string;
  error?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full min-w-0 max-w-lg">
      <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="space-y-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {body ? (
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {body}
            </p>
          ) : null}
        </div>
        <Flash error={error} />
        {children}
      </div>
    </section>
  );
}

export function StartPrimaryButton({
  children,
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="submit"
      variant="default"
      size="lg"
      className={cn(homePrimaryCtaClassName, className)}
      {...props}
    >
      {children}
    </Button>
  );
}
