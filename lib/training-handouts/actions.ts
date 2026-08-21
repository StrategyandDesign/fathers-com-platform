"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import {
  TRAINING_HANDOUTS_BUCKET,
  TRAINING_HANDOUT_MAX_BYTES,
  TRAINING_HANDOUT_MAX_COUNT,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { isPdfBytes, sanitizeHandoutName, trainingHandoutPath } from "@/lib/training-handouts/names";

export type TrainingHandoutResult = {
  error?: string;
  notice?: string;
};

function revalidateHandouts(trainingId: string) {
  revalidatePath(`/admin/trainings/${trainingId}`);
  revalidatePath(`/admin/trainings/${trainingId}/stage`);
  revalidatePath(`/admin/trainings/${trainingId}/stage/overview`);
  revalidatePath(`/father/trainings`);
  revalidatePath(`/father/trainings/${trainingId}`);
  revalidatePath(`/manager/reviews/${trainingId}`);
}

export async function uploadTrainingHandout(
  formData: FormData
): Promise<TrainingHandoutResult> {
  const { user } = await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  if (!trainingId) return { error: "Choose a training." };

  if (!(await allowActionRateLimit("admin.training_handout"))) {
    return { error: "Too many PDF uploads. Wait a few minutes and try again." };
  }

  const file = formData.get("handout");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF to upload." };
  }
  if (file.size > TRAINING_HANDOUT_MAX_BYTES) {
    return { error: "PDF must be 5 MB or smaller." };
  }
  if (file.type && file.type !== "application/pdf") {
    return { error: "Use a PDF." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfBytes(bytes)) {
    return { error: "That file doesn’t look like a PDF." };
  }

  const fileName = sanitizeHandoutName(file.name);
  const supabase = await createClient();
  const { data: training, error: trainingError } = await supabase
    .from("trainings")
    .select("id")
    .eq("id", trainingId)
    .maybeSingle();
  if (trainingError || !training) {
    return { error: "Choose a training." };
  }

  const { count, error: countError } = await supabase
    .from("training_handouts")
    .select("id", { count: "exact", head: true })
    .eq("training_id", trainingId);

  if (countError) {
    return { error: "Couldn’t check existing PDFs. Try again." };
  }
  if ((count ?? 0) >= TRAINING_HANDOUT_MAX_COUNT) {
    return { error: "This training already has 3 PDFs. Remove one first." };
  }

  const handoutId = crypto.randomUUID();
  const objectPath = trainingHandoutPath(trainingId, handoutId);
  const { error: uploadError } = await supabase.storage
    .from(TRAINING_HANDOUTS_BUCKET)
    .upload(objectPath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { error: "The PDF didn’t save. Try a file under 5 MB." };
  }

  const { error } = await supabase.from("training_handouts").insert({
    id: handoutId,
    training_id: trainingId,
    storage_path: objectPath,
    file_name: fileName,
    byte_size: bytes.byteLength,
    updated_by: user.id,
  });

  if (error) {
    await supabase.storage.from(TRAINING_HANDOUTS_BUCKET).remove([objectPath]);
    return { error: "The PDF didn’t save. Try again." };
  }

  revalidateHandouts(trainingId);
  return { notice: "PDF saved." };
}

export async function removeTrainingHandout(
  formData: FormData
): Promise<TrainingHandoutResult> {
  await requireRole("admin");
  const trainingId = String(formData.get("training_id") ?? "");
  const handoutId = String(formData.get("handout_id") ?? "");
  if (!trainingId || !handoutId) return { error: "Choose a PDF to remove." };

  if (!(await allowActionRateLimit("admin.training_handout"))) {
    return { error: "Too many PDF changes. Wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("training_handouts")
    .select("id, storage_path")
    .eq("id", handoutId)
    .eq("training_id", trainingId)
    .maybeSingle();

  if (loadError || !data) {
    return { error: "Couldn’t remove that PDF. Try again." };
  }

  const { error } = await supabase
    .from("training_handouts")
    .delete()
    .eq("id", handoutId)
    .eq("training_id", trainingId);

  if (error) {
    return { error: "Couldn’t remove that PDF. Try again." };
  }

  await supabase.storage.from(TRAINING_HANDOUTS_BUCKET).remove([data.storage_path]);
  revalidateHandouts(trainingId);
  return { notice: "PDF removed." };
}
