export const PARTICIPATION_MODES = ["unset", "expected", "open"] as const;

export type ParticipationMode = (typeof PARTICIPATION_MODES)[number];

export function isParticipationMode(value: unknown): value is ParticipationMode {
  return value === "unset" || value === "expected" || value === "open";
}

export function parseParticipationMode(value: unknown): ParticipationMode {
  return isParticipationMode(value) ? value : "unset";
}

export function participationModeFromGroups(
  groups: Array<{ participation_mode?: string | null }>
): ParticipationMode {
  if (groups.length === 0) return "unset";
  const modes = groups.map((group) => parseParticipationMode(group.participation_mode));
  if (modes.every((mode) => mode === "expected")) return "expected";
  if (modes.every((mode) => mode === "open")) return "open";
  return "unset";
}

export function participationCopyKey(mode: ParticipationMode, base: string) {
  if (mode === "expected") return `${base}Expected`;
  if (mode === "open") return `${base}Open`;
  return base;
}
