import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
