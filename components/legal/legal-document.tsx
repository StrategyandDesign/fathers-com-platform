import { BrandLogo } from "@/components/brand/logo";
import { LegalLinks } from "@/components/legal/legal-links";
import { getI18n } from "@/lib/i18n/server";

export async function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const { t } = await getI18n();

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-5 sm:px-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <header>
        <BrandLogo href="/" />
      </header>

      <article className="mt-8 flex-1 space-y-8 sm:mt-10">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{updated}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("legal.disclaimer")}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </article>

      <LegalLinks className="mt-10" />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
