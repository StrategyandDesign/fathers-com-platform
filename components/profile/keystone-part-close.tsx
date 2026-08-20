import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PROFILE_SECTION_COUNT, partsLeftAfterSection } from "@/lib/father/questions";
import type { Translate } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

function leftWord(left: number, t: Translate) {
  if (left === 1) return t("father.profile.partCloseLeft1");
  if (left === 2) return t("father.profile.partCloseLeft2");
  return t("father.profile.partCloseLeft3");
}

export function KeystonePartClose({
  part,
  nextHref,
  exitHref,
  t,
}: {
  part: number;
  nextHref: string;
  exitHref: string;
  t: Translate;
}) {
  const left = partsLeftAfterSection(part);
  const title = t("father.profile.partClose", {
    n: part,
    left: leftWord(left, t),
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {t("father.profile.sectionOf", { n: part, total: PROFILE_SECTION_COUNT })}
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <div className="mt-8 flex flex-col gap-3">
        <Link href={nextHref} className={cn(buttonVariants({ size: "lg" }), "w-full min-h-12")}>
          {t("father.profile.nextPart")}
        </Link>
        <Link
          href={exitHref}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full min-h-11 text-sm text-muted-foreground"
          )}
        >
          {t("father.profile.saveExit")}
        </Link>
      </div>
    </section>
  );
}
