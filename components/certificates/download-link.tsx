import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { certificateDownloadPath } from "@/lib/certificates/types";
import { cn } from "@/lib/utils";

export function CertificateDownloadLink({
  certificateId,
  className,
  children = "Download PDF",
  variant = "default",
  size = "sm",
}: {
  certificateId: string;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "inverse";
  size?: "sm" | "default";
}) {
  return (
    <Link
      href={certificateDownloadPath(certificateId)}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  );
}
