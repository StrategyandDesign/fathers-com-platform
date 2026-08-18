import {
  RELEASE_STATE_LABEL,
  releaseStateClassName,
  type TrainingReleaseState,
} from "@/lib/admin/release";

export function ReleaseStatusBadge({ state }: { state: TrainingReleaseState }) {
  return (
    <span className={`text-sm font-medium ${releaseStateClassName(state)}`}>
      {RELEASE_STATE_LABEL[state]}
    </span>
  );
}
