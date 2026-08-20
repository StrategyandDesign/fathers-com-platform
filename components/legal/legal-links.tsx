import Link from "next/link";

import { getI18n } from "@/lib/i18n/server";
import { interactiveControlClassName, interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const linkClassName = cn(
  "inline-flex min-h-11 items-center text-sm",
  interactiveUnderlineClassName
);

export async function LegalLinks({
  className,
  align = "start",
  copyright = false,
  helpHref,
  onPhoto = false,
}: {
  className?: string;
  align?: "start" | "center";
  copyright?: boolean;
  helpHref?: string;
  onPhoto?: boolean;
}) {
  const { t } = await getI18n();
  const links = onPhoto
    ? cn(
        "inline-flex min-h-11 items-center text-sm text-white/90 underline underline-offset-4",
        interactiveControlClassName,
        "hover:text-white"
      )
    : linkClassName;
  const mute = onPhoto ? "text-white/50" : "text-muted-foreground";
  const nav = (
    <nav
      aria-label={helpHref ? t("legal.legalAndHelp") : t("legal.legal")}
      className={cn(
        "flex flex-wrap items-center gap-x-3",
        align === "center" && "justify-center",
        !copyright && className
      )}
    >
      <Link href="/privacy" className={links}>
        {t("legal.privacy")}
      </Link>
      <span className={mute} aria-hidden>
        ·
      </span>
      <Link href="/terms" className={links}>
        {t("legal.terms")}
      </Link>
      {helpHref ? (
        <>
          <span className={mute} aria-hidden>
            ·
          </span>
          <Link href={helpHref} className={links}>
            {t("legal.help")}
          </Link>
        </>
      ) : null}
    </nav>
  );

  if (!copyright) {
    return nav;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {nav}
      <p className={cn("text-xs", onPhoto ? "text-white/65" : "text-muted-foreground")}>
        {t("legal.copyright")}
      </p>
    </div>
  );
}
