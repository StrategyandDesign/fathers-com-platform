import Link from "next/link";

import { cn } from "@/lib/utils";

export function ManagerNav({ current }: { current: "dashboard" | "participants" }) {
  const links = [
    { href: "/manager", key: "dashboard" as const, label: "Dashboard" },
    { href: "/manager/participants", key: "participants" as const, label: "Participants" },
  ];

  return (
    <nav className="flex gap-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            current === link.key && "font-medium text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
