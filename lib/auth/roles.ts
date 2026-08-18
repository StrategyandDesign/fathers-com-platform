export const APP_ROLES = ["father", "manager", "reviewer", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Internal role labels. Human-facing manager chrome is Leader. */
export const ROLE_LABEL: Record<AppRole, string> = {
  father: "Father Participant",
  manager: "Leader",
  reviewer: "Reviewer",
  admin: "Super-admin",
};

/** Father identity uses the org name. Other roles use the role label. */
export function roleChromeLabel(
  role: AppRole,
  organizationName?: string | null
): string | null {
  if (role === "father") {
    const name = organizationName?.trim();
    return name || null;
  }
  return ROLE_LABEL[role];
}

export const ROLE_HOME: Record<AppRole, string> = {
  father: "/father",
  manager: "/manager",
  reviewer: "/reviewer",
  admin: "/admin",
};

export const ROLE_ACCOUNT: Record<AppRole, string> = {
  father: "/father/account",
  manager: "/manager/account",
  reviewer: "/reviewer/account",
  admin: "/admin/account",
};

export const ROLE_HELP = {
  father: "/father/help",
  manager: "/manager/help",
  reviewer: "/reviewer/help",
} as const;

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

/**
 * Authorization role comes from Auth app_metadata only.
 * Never read user_metadata for access decisions — that claim is user-editable.
 * RLS reads public.profiles.role. Both must match.
 *
 * First super-admin: there is no signup-as-admin path. In the Pilot SQL
 * editor, set profiles.role and auth.users.raw_app_meta_data.role to
 * 'admin' for a known email (see supabase/sql/promote_pilot_role.sql),
 * then sign out and sign in so the JWT refreshes.
 */
export function resolveRole(
  user: { app_metadata?: Record<string, unknown> } | null
): AppRole {
  const role = user?.app_metadata?.role;
  return isAppRole(role) ? role : "father";
}

/** Prefer profiles.role so page gates match RLS. Fall back to the JWT. */
export function resolveProfileRole(
  profileRole: unknown,
  user: { app_metadata?: Record<string, unknown> } | null
): AppRole {
  return isAppRole(profileRole) ? profileRole : resolveRole(user);
}

export function roleForPath(pathname: string): AppRole | null {
  if (
    pathname === "/home" ||
    pathname === "/father" ||
    pathname.startsWith("/father/")
  ) {
    return "father";
  }
  if (pathname === "/manager" || pathname.startsWith("/manager/")) {
    return "manager";
  }
  if (pathname === "/reviewer" || pathname.startsWith("/reviewer/")) {
    return "reviewer";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }
  return null;
}

export function isAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  );
}

export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value;
}
