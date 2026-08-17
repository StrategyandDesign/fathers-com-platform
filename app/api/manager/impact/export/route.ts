import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { renderImpactPdf } from "@/lib/manager/impact-pdf";
import { impactFilename, loadManagerImpact } from "@/lib/manager/impact";
import { allowRequestRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function fail(message: string): never {
  redirect(`/manager/impact?error=${encodeURIComponent(message)}`);
}

export async function GET(request: Request) {
  const { user } = await requireRole("manager");

  if (!allowRequestRateLimit("manager.impact_export", request)) {
    fail("Too many snapshot downloads. Try again in a few minutes.");
  }

  try {
    const snapshot = await loadManagerImpact(user.id);
    const bytes = await renderImpactPdf(snapshot);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${impactFilename()}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not generate the snapshot PDF.");
  }
}
