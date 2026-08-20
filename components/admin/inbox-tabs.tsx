import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InboxTabs({ active }: { active: "reports" | "requests" | "leaders" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/admin/support"
        className={cn(
          buttonVariants({ variant: active === "reports" ? "default" : "outline" }),
          "flex-1 sm:flex-none"
        )}
      >
        Reports
      </Link>
      <Link
        href="/admin/support/requests"
        className={cn(
          buttonVariants({ variant: active === "requests" ? "default" : "outline" }),
          "flex-1 sm:flex-none"
        )}
      >
        Training Requests
      </Link>
      <Link
        href="/admin/support/leaders"
        className={cn(
          buttonVariants({ variant: active === "leaders" ? "default" : "outline" }),
          "flex-1 sm:flex-none"
        )}
      >
        Leader invites
      </Link>
    </div>
  );
}
