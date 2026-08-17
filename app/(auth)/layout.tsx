import { BrandLogo } from "@/components/brand/logo";
import { LegalLinks } from "@/components/legal/legal-links";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-5 sm:px-5 sm:py-10 md:px-6 md:py-16 lg:px-8">
      <div className="mb-8">
        <BrandLogo href="/" />
      </div>
      <div className="w-full max-w-[24rem]">{children}</div>
      <LegalLinks align="center" copyright className="mt-6" />
    </div>
  );
}
