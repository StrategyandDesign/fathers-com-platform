import Link from "next/link";

import { signOut } from "@/lib/auth/actions";
import { ROLE_HOME, ROLE_LABEL, type AppRole } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RoleShell({
  role,
  email,
  children,
}: {
  role: AppRole;
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href={ROLE_HOME[role]} className="font-medium">
              Fathers.com
            </Link>
            <Badge variant="secondary">{ROLE_LABEL[role]}</Badge>
          </div>
          <div className="flex items-center gap-3">
            {email ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {email}
              </span>
            ) : null}
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
