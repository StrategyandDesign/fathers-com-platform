import {
  INTAKE_STATUS_LABEL,
  RIGHTS_STATUS_LABEL,
  rightsStatusClassName,
  type IntakeStatus,
  type RightsStatus,
} from "@/lib/admin/sourcing";
import { cn } from "@/lib/utils";

export function RightsStatusBadge({ status }: { status: RightsStatus }) {
  return (
    <span className={cn("text-sm font-medium", rightsStatusClassName(status))}>
      {RIGHTS_STATUS_LABEL[status]}
    </span>
  );
}

export function IntakeStatusBadge({ status }: { status: IntakeStatus }) {
  return (
    <span
      className={cn(
        "text-sm font-medium",
        status === "released" ? "text-primary" : "text-muted-foreground"
      )}
    >
      {INTAKE_STATUS_LABEL[status]}
    </span>
  );
}
