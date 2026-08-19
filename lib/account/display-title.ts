import type { Translate } from "@/lib/i18n/translate";

export const MANAGER_DISPLAY_TITLES = ["leader", "manager"] as const;

export type ManagerDisplayTitle = (typeof MANAGER_DISPLAY_TITLES)[number];

export function isManagerDisplayTitle(value: unknown): value is ManagerDisplayTitle {
  return value === "manager" || value === "leader";
}

export function parseManagerDisplayTitle(value: unknown): ManagerDisplayTitle {
  return isManagerDisplayTitle(value) ? value : "manager";
}

/** Visible name for a manager. Auth role stays manager. */
export function managerDisplayTitleLabel(title: ManagerDisplayTitle, t: Translate): string {
  return title === "leader" ? t("account.displayTitleLeader") : t("account.displayTitleManager");
}
