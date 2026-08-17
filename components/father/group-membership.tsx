import type { AppRole } from "@/lib/auth/roles";

export function FatherGroupMembership({
  role,
  name,
}: {
  role: AppRole;
  name?: string | null;
}) {
  if (role !== "father") return null;
  const label = name?.trim();
  if (!label) return null;

  return <p className="text-sm text-muted-foreground">{label}</p>;
}
