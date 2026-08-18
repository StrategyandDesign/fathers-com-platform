import {
  DEVELOPMENT_STATUS_LABEL,
  developmentStatusClassName,
  type DevelopmentStatus,
} from "@/lib/admin/development";

export function DevelopmentStatusBadge({ status }: { status: DevelopmentStatus }) {
  return (
    <span className={`text-sm font-medium ${developmentStatusClassName(status)}`}>
      {DEVELOPMENT_STATUS_LABEL[status]}
    </span>
  );
}
