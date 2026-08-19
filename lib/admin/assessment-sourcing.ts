import {
  INTAKE_AUDIENCE_MAX,
  INTAKE_RIGHTS_NOTES_MAX,
  INTAKE_TITLE_MAX,
  SOURCE_CHANNEL_MAX,
  SOURCE_CONTACT_MAX,
  SOURCE_EMAIL_MAX,
  SOURCE_NAME_MAX,
  SOURCE_NOTES_MAX,
  asRightsStatus,
} from "@/lib/admin/sourcing";
import { compileInstrument } from "@/lib/assessments/instrument";

export const ASSESSMENT_OUTLINE_MAX = 12000;
export const ASSESSMENT_SCORING_MAX = 4000;
export const ASSESSMENT_DESCRIPTION_MAX = 2000;

export {
  INTAKE_AUDIENCE_MAX,
  INTAKE_RIGHTS_NOTES_MAX,
  INTAKE_TITLE_MAX,
  SOURCE_CHANNEL_MAX,
  SOURCE_CONTACT_MAX,
  SOURCE_EMAIL_MAX,
  SOURCE_NAME_MAX,
  SOURCE_NOTES_MAX,
};

export const ASSESSMENT_RIGHTS_REQUIRED =
  "Record written clearance for this researcher before releasing the assessment to Leaders.";

export const ASSESSMENT_RIGHTS_DECLINED =
  "This researcher declined use. Record clearance, or archive the intake. Do not release it.";

export function sourcedReleaseBlocker(
  intake: { rights_status?: string | null; rightsStatus?: string | null } | null
) {
  if (!intake) return null;
  const rights = asRightsStatus(intake.rights_status ?? intake.rightsStatus);
  if (rights === "cleared") return null;
  if (rights === "declined") return ASSESSMENT_RIGHTS_DECLINED;
  return ASSESSMENT_RIGHTS_REQUIRED;
}

export function compileIntakeInstrument(questions: string, scoring: string) {
  return compileInstrument(questions, scoring);
}
