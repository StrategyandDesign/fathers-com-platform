import { BrandLogo } from "@/components/brand/logo";
import { LegalLinks } from "@/components/legal/legal-links";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getI18n();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-5 sm:px-5 sm:py-10 md:px-6 md:py-16 lg:px-8">
      <div className="mb-8">
        <BrandLogo href="/" />
      </div>
      <p className="mb-6 max-w-[24rem] text-center text-sm text-muted-foreground">
        {t("auth.pilotNotice")}
      </p>
      <div className="w-full max-w-[24rem]">{children}</div>
      <LegalLinks align="center" copyright className="mt-6" />
    </div>
  );
}
