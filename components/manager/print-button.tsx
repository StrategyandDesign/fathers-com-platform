"use client";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

export function PrintButton({ children }: { children?: string }) {
  const t = useT();
  return (
    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => window.print()}>
      {children ?? t("common.print")}
    </Button>
  );
}
