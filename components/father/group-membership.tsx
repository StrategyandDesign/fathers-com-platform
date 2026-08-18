import { OrganizationMark } from "@/components/brand/organization-mark";
import type { AppRole } from "@/lib/auth/roles";

export function FatherGroupMembership({
  role,
  name,
  logoUrl,
}: {
  role: AppRole;
  name?: string | null;
  logoUrl?: string | null;
}) {
  if (role !== "father") return null;
  if (!name?.trim() && !logoUrl) return null;

  return <OrganizationMark name={name} logoUrl={logoUrl} />;
}
