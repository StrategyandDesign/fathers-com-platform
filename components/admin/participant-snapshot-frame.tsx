import Link from "next/link";
import { ClipboardList, Home } from "lucide-react";

import { BrandLogo } from "@/components/brand/logo";
import { BrandLogoArrow } from "@/components/brand/logo-arrow";
import { UserAvatar } from "@/components/layout/user-avatar";
import { cn } from "@/lib/utils";

export function ParticipantSnapshotFrame({
  hubHref,
  view,
  children,
}: {
  hubHref: string;
  view: "home" | "catalog";
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[26rem] rounded-[1.85rem] border border-white/10 bg-black p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="overflow-hidden rounded-[1.45rem] border border-border bg-[#0c0f0c]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
          <BrandLogo href={hubHref} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              Participant
            </span>
            <UserAvatar name="Participant" className="size-8 text-[10px]" />
          </div>
        </div>
        <div className="bg-background px-4 py-5">{children}</div>
        <nav
          aria-label="Participant tabs in this snapshot"
          className="flex h-14 border-t border-white/10 bg-background/95"
        >
          <SnapshotTab
            href={`${hubHref}?view=home`}
            label="Home"
            icon={Home}
            active={view === "home"}
          />
          <SnapshotTab
            href={`${hubHref}?view=catalog`}
            label="Trainings"
            icon={BrandLogoArrow}
            active={view === "catalog"}
          />
          <span className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] leading-tight text-muted-foreground/50">
            <ClipboardList className="size-[22px]" strokeWidth={1.6} />
            Assessments
          </span>
        </nav>
      </div>
    </div>
  );
}

function SnapshotTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] leading-tight",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-[22px]" strokeWidth={1.6} />
      {label}
    </Link>
  );
}
