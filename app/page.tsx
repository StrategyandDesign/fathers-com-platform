import { redirect } from "next/navigation";

import { ROLE_HOME } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";

export default async function HomePage() {
  const { user, role } = await getAuthContext();
  if (user && role) {
    redirect(ROLE_HOME[role]);
  }
  redirect("/login");
}
