"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ children = "Print" }: { children?: string }) {
  return (
    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => window.print()}>
      {children}
    </Button>
  );
}
