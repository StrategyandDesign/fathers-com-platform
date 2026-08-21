import type { AppRole } from "@/lib/auth/roles";

/** Fathers and leaders share Gathering counts unless they turn it off. */
export function anonymousShareOnByDefault(role: AppRole | null | undefined) {
  return role === "father" || role === "manager";
}
