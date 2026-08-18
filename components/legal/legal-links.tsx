import Link from "next/link";

import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName } from "@/lib/ui";
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
}: {
  className?: string;
  align?: "start" | "center";
  copyright?: boolean;
  helpHref?: string;
}) {
  const { t } = await getI18n();
  const nav = (
    <nav
      aria-label={helpHref ? t("legal.legalAndHelp") : t("legal.legal")}
      className={cn(
        "flex flex-wrap items-center gap-x-3",
        align === "center" && "justify-center",
        !copyright && className
      )}
    >
      <Link href="/privacy" className={linkClassName}>
        {t("legal.privacy")}
      </Link>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <Link href="/terms" className={linkClassName}>
        {t("legal.terms")}
      </Link>
      {helpHref ? (
        <>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <Link href={helpHref} className={linkClassName}>
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
      <p className="text-xs text-muted-foreground">{t("legal.copyright")}</p>
    </div>
  );
}
