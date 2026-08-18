import type { User } from "@supabase/supabase-js";

import { renderCertificatePdf } from "@/lib/certificates/pdf";
import { formatCertificateDate } from "@/lib/certificates/types";
import { notifyCertificateIssued, notifyTrainingAssigned } from "@/lib/email/events";
import { isSessionComplete, isTrainingPublished } from "@/lib/father/types";
import { isTrainingAssignable } from "@/lib/manager/reviews";
import { displayName, profileName } from "@/lib/manager/types";
import { CERTIFICATES_BUCKET, certificateObjectPath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type MutationStatus = "ok" | "skipped" | "failed";

export type MutationResult = {
  status: MutationStatus;
  reason?: string;
  serial?: string;
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function assignTrainingToFather(
  supabase: ServerClient,
  user: User,
  fatherId: string,
  trainingId: string
): Promise<MutationResult> {
  const { data: catalog, error: catalogError } = await supabase
    .from("trainings")
    .select(
      "id, title, published, released_at, first_published_at, first_released_at, series_id, part_number"
    )
    .eq("id", trainingId)
    .maybeSingle();

  if (catalogError) return { status: "failed", reason: "Couldn’t load that training." };
  if (!catalog || !isTrainingPublished(catalog)) {
    return { status: "failed", reason: "That training is not published." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("father_id", fatherId)
    .maybeSingle();

  if (membershipError) return { status: "failed", reason: "Couldn’t verify this participant." };
  if (!membership) {
    return { status: "failed", reason: "That participant is not in your group." };
  }

  const { data: review, error: reviewError } = await supabase
    .from("organization_training_reviews")
    .select("status")
    .eq("group_id", membership.group_id)
    .eq("training_id", trainingId)
    .maybeSingle();

  if (reviewError) return { status: "failed", reason: "Couldn’t check this training’s review." };
  if (!isTrainingAssignable(catalog, review?.status)) {
    return {
      status: "failed",
      reason: catalog.released_at
        ? "This training is not available for your organization yet."
        : "This training is not available to assign.",
    };
  }

  const targets: string[] = [trainingId];
  if (catalog.series_id) {
    const { data: parts, error: partsError } = await supabase
      .from("trainings")
      .select(
        "id, published, released_at, first_published_at, first_released_at, part_number"
      )
      .eq("series_id", catalog.series_id)
      .order("part_number");
    if (partsError) return { status: "failed", reason: "Couldn’t load that training." };
    for (const part of parts ?? []) {
      if (part.id === trainingId) continue;
      if (!isTrainingPublished(part)) continue;
      const { data: partReview, error: partReviewError } = await supabase
        .from("organization_training_reviews")
        .select("status")
        .eq("group_id", membership.group_id)
        .eq("training_id", part.id)
        .maybeSingle();
      if (partReviewError) continue;
      if (!isTrainingAssignable(part, partReview?.status)) continue;
      targets.push(part.id);
    }
  }

  let assignedRequested = false;
  let alreadyAssigned = false;
  for (const targetId of targets) {
    const { error } = await supabase.from("training_assignments").insert({
      father_id: fatherId,
      training_id: targetId,
      assigned_by: user.id,
    });
    if (!error) {
      if (targetId === trainingId) assignedRequested = true;
      continue;
    }
    if (error.code === "23505") {
      if (targetId === trainingId) alreadyAssigned = true;
      continue;
    }
    return { status: "failed", reason: "The assignment didn’t save." };
  }

  if (alreadyAssigned && !assignedRequested) {
    return { status: "skipped", reason: "Already assigned." };
  }

  await notifyTrainingAssigned({
    fatherId,
    trainingTitle: catalog.title ?? "A training",
  });
  return { status: "ok" };
}

export async function markSessionsCompleteForFather(
  supabase: ServerClient,
  fatherId: string,
  trainingId: string,
  sessionId?: string | null
): Promise<MutationResult> {
  const sessionsQuery = supabase.from("sessions").select("id").eq("training_id", trainingId);
  const { data: sessions, error: sessionError } = sessionId
    ? await sessionsQuery.eq("id", sessionId)
    : await sessionsQuery;

  if (sessionError) return { status: "failed", reason: "Couldn’t load sessions for that training." };
  if (!sessions || sessions.length === 0) {
    return {
      status: "failed",
      reason: sessionId
        ? "That session is not in the selected training."
        : "That training has no sessions yet.",
    };
  }

  const sessionIds = sessions.map((session) => session.id);
  const { data: existing, error: existingError } = await supabase
    .from("session_progress")
    .select("session_id, film_completed, checkin_completed, action_completed, completed_at")
    .eq("father_id", fatherId)
    .in("session_id", sessionIds);

  if (existingError) return { status: "failed", reason: "Couldn’t load current progress." };

  const bySession = new Map((existing ?? []).map((row) => [row.session_id, row]));
  const now = new Date().toISOString();
  const rows = sessionIds
    .filter((id) => !isSessionComplete(bySession.get(id) ?? null))
    .map((id) => ({
      father_id: fatherId,
      session_id: id,
      film_completed: true,
      checkin_completed: true,
      action_completed: true,
      status: "completed" as const,
      completed_at: bySession.get(id)?.completed_at ?? now,
    }));

  if (rows.length === 0) {
    return {
      status: "skipped",
      reason: sessionId ? "That session is already complete." : "That training is already complete.",
    };
  }

  const { error } = await supabase
    .from("session_progress")
    .upsert(rows, { onConflict: "father_id,session_id" });

  if (error) return { status: "failed", reason: "Progress didn’t save." };
  return { status: "ok" };
}

export async function issueCertificateToFather(
  supabase: ServerClient,
  user: User,
  fatherId: string,
  trainingId: string,
  options?: { requireComplete?: boolean }
): Promise<MutationResult> {
  const requireComplete = options?.requireComplete !== false;
  const { data: existing, error: existingError } = await supabase
    .from("certificates")
    .select("id, serial_number")
    .eq("father_id", fatherId)
    .eq("training_id", trainingId)
    .maybeSingle();

  if (existingError) return { status: "failed", reason: "Couldn’t check for an existing certificate." };
  if (existing) {
    return { status: "skipped", reason: "A certificate is already on file.", serial: existing.serial_number };
  }

  if (requireComplete) {
    const { data: sessions, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("training_id", trainingId);

    if (sessionError) return { status: "failed", reason: "Couldn’t load sessions for that training." };
    if (!sessions || sessions.length === 0) {
      return { status: "skipped", reason: "That training has no sessions yet." };
    }

    const { data: progress, error: progressError } = await supabase
      .from("session_progress")
      .select("session_id, film_completed, checkin_completed, action_completed")
      .eq("father_id", fatherId)
      .in(
        "session_id",
        sessions.map((session) => session.id)
      );

    if (progressError) return { status: "failed", reason: "Couldn’t load progress." };

    const completeIds = new Set(
      (progress ?? []).filter((row) => isSessionComplete(row)).map((row) => row.session_id)
    );
    if (sessions.some((session) => !completeIds.has(session.id))) {
      return { status: "skipped", reason: "Training is not fully complete." };
    }
  }

  const [fatherRes, trainingRes, managerRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", fatherId).maybeSingle(),
    supabase.from("trainings").select("id, title").eq("id", trainingId).maybeSingle(),
    supabase.from("profiles").select("id, full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (fatherRes.error || trainingRes.error || managerRes.error) {
    return { status: "failed", reason: "Couldn’t load this certificate." };
  }
  if (!fatherRes.data || !trainingRes.data) {
    return { status: "failed", reason: "Couldn’t load this certificate." };
  }

  const issuedAt = new Date();
  const serial = `FC-${issuedAt.getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const fatherName = displayName(fatherRes.data, fatherId);
  const managerName = profileName(managerRes.data, user.email?.split("@")[0] ?? "Manager");
  const storagePath = certificateObjectPath(fatherId, serial);

  let pdf: Uint8Array;
  try {
    pdf = await renderCertificatePdf({
      fatherName,
      trainingName: trainingRes.data.title,
      completedOn: formatCertificateDate(issuedAt.toISOString()),
      serialNumber: serial,
      managerName,
    });
  } catch {
    return { status: "failed", reason: "The PDF didn’t generate." };
  }

  const { error: uploadError } = await supabase.storage.from(CERTIFICATES_BUCKET).upload(storagePath, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadError) return { status: "failed", reason: "The certificate PDF didn’t save." };

  const { error } = await supabase.from("certificates").insert({
    father_id: fatherId,
    training_id: trainingId,
    serial_number: serial,
    issued_by: user.id,
    issued_at: issuedAt.toISOString(),
    pdf_storage_path: storagePath,
  });

  if (error) {
    await supabase.storage.from(CERTIFICATES_BUCKET).remove([storagePath]);
    return { status: "failed", reason: "The certificate didn’t save." };
  }

  await notifyCertificateIssued({
    fatherId,
    managerId: user.id,
    fatherName,
    trainingTitle: trainingRes.data.title,
    serial,
  });

  return { status: "ok", serial };
}
