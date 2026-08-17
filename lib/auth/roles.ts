export const APP_ROLES = ["father", "manager", "reviewer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABEL: Record<AppRole, string> = {
  father: "Father Participant",
  manager: "Manager",
  reviewer: "Reviewer",
};

export const ROLE_HOME: Record<AppRole, string> = {
  father: "/father",
  manager: "/manager",
  reviewer: "/reviewer",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

/**
 * Authorization role comes from Auth app_metadata only.
 * Never read user_metadata for access decisions — that claim is user-editable.
 */
export function resolveRole(
  user: { app_metadata?: Record<string, unknown> } | null
): AppRole {
  const role = user?.app_metadata?.role;
  return isAppRole(role) ? role : "father";
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
