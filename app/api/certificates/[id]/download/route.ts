import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
import { loadCertificatePdfBytes } from "@/lib/certificates/data";
import { certificateFilename } from "@/lib/certificates/types";
import { allowRequestRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!allowRequestRateLimit("certificates.download", request)) {
    return new Response("Too many downloads. Wait a few minutes and try again.", { status: 429 });
  }

  const { user } = await getAuthContext();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const file = await loadCertificatePdfBytes(id);

  if (!file) {
    return new Response("Certificate not found.", { status: 404 });
  }

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificateFilename(file.serialNumber)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
