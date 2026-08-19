export const SKILL_USES = ["used", "later"] as const;

export type SkillUse = (typeof SKILL_USES)[number];

export const SKILL_USE_FOLLOW_UP_MS = 12 * 60 * 60 * 1000;

export type SkillUseCandidate = {
  sessionId: string;
  sessionTitle: string;
  skill: string;
  completedAt: string | null;
  skillUse: SkillUse | null;
};

export type SkillUsePrompt = {
  sessionId: string;
  sessionTitle: string;
  skill: string;
};

export function isSkillUse(value: unknown): value is SkillUse {
  return value === "used" || value === "later";
}

export function parseSkillUse(value: unknown): SkillUse | null {
  return isSkillUse(value) ? value : null;
}

export function nextSkillUse(current: SkillUse | null, next: SkillUse): SkillUse {
  if (current === "used") return "used";
  return next;
}

export function skillUseFollowUpDue(
  completedAt: string | null | undefined,
  now: Date = new Date(),
  waitMs: number = SKILL_USE_FOLLOW_UP_MS
) {
  if (!completedAt) return true;
  const time = Date.parse(completedAt);
  if (Number.isNaN(time)) return true;
  return now.getTime() - time >= waitMs;
}

export function pickSkillUseFollowUp(
  candidates: SkillUseCandidate[],
  now: Date = new Date()
): SkillUsePrompt | null {
  const open = candidates
    .filter(
      (row) =>
        row.skillUse === null && skillUseFollowUpDue(row.completedAt, now)
    )
    .sort((left, right) => {
      const leftTime = Date.parse(left.completedAt ?? "") || 0;
      const rightTime = Date.parse(right.completedAt ?? "") || 0;
      return rightTime - leftTime;
    });
  const row = open[0];
  if (!row) return null;
  return {
    sessionId: row.sessionId,
    sessionTitle: row.sessionTitle,
    skill: row.skill,
  };
}

export function countSkillsUsed(
  rows: Array<{ skill_use?: string | null; skillUse?: SkillUse | null }>
) {
  return rows.filter((row) => parseSkillUse(row.skill_use ?? row.skillUse) === "used")
    .length;
}
