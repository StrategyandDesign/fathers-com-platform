import { BrandLogo } from "@/components/brand/logo";
import { LegalLinks } from "@/components/legal/legal-links";
import { getI18n } from "@/lib/i18n/server";
import { loadLoginBackground } from "@/lib/platform-photos/data";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getI18n();
  const background = await loadLoginBackground();

  return (
    <div className="relative isolate min-h-svh overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={background.url}
          alt=""
          fetchPriority="high"
          className="h-full w-full object-cover"
          data-login-background={background.isCustom ? "custom" : "default"}
        />
        <div className="absolute inset-0 bg-[#0a0f0a]/45" />
      </div>
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-4 py-5 sm:px-5 sm:py-10 md:px-6 md:py-16 lg:px-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <BrandLogo href="/" size="display" />
          <p className="max-w-[24rem] text-center text-sm text-white/85 drop-shadow-sm">
            {t("auth.pilotNotice")}
          </p>
        </div>
        <div className="w-full max-w-[24rem] rounded-xl shadow-2xl">{children}</div>
        <LegalLinks align="center" copyright onPhoto className="mt-6" />
      </div>
    </div>
  );
}
