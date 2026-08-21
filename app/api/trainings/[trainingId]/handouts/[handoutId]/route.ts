import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
import { allowRequestRateLimit } from "@/lib/security/rate-limit";
import { TRAINING_HANDOUTS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { loadTrainingHandoutRecord } from "@/lib/training-handouts/data";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trainingId: string; handoutId: string }> }
) {
  if (!allowRequestRateLimit("training.handout_download", request)) {
    return new Response("Too many downloads. Wait a few minutes and try again.", {
      status: 429,
    });
  }

  const { user } = await getAuthContext();
  if (!user) {
    redirect("/login");
  }

  const { trainingId, handoutId } = await params;
  const row = await loadTrainingHandoutRecord(trainingId, handoutId);
  if (!row) {
    return new Response("Handout not found.", { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(TRAINING_HANDOUTS_BUCKET)
    .download(row.storage_path);

  if (error || !data) {
    return new Response("Handout not found.", { status: 404 });
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const filename = row.file_name.replace(/"/g, "");

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
