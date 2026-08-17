import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { certificateDownloadPath } from "@/lib/certificates/types";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function CertificateDownloadLink({
  certificateId,
  className,
  children,
  variant = "default",
  size = "sm",
}: {
  certificateId: string;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "inverse";
  size?: "sm" | "default";
}) {
  const { t } = await getI18n();
  return (
    <Link
      href={certificateDownloadPath(certificateId)}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children ?? t("common.downloadPdf")}
    </Link>
  );
}
