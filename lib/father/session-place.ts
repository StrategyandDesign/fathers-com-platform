import type { Translate } from "@/lib/i18n/translate";

export function sessionPlaceLabel(
  sessionNumber: number | null | undefined,
  total: number | null | undefined,
  t: Translate
) {
  if (sessionNumber && total) {
    return t("father.session.sessionOfTotal", { n: sessionNumber, total });
  }
  if (total) {
    return t("father.session.programLength", { total });
  }
  return null;
}
