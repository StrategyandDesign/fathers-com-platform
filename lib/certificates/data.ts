import { createClient } from "@/lib/supabase/server";
import { CERTIFICATES_BUCKET } from "@/lib/storage";
import { displayName, profileName } from "@/lib/manager/types";
import {
  formatCertificateDate,
  resolveCertificateIssuerName,
  type CertificatePayload,
  type IssuedCertificate,
} from "@/lib/certificates/types";
import { renderCertificatePdf } from "@/lib/certificates/pdf";

type CertificateRow = {
  id: string;
  father_id: string;
  training_id: string;
  serial_number: string;
  issued_at: string;
  issued_by: string | null;
  issuer_name: string | null;
  pdf_storage_path: string | null;
};

type TrainingJoin = { title: string } | { title: string }[] | null;

function trainingTitle(value: TrainingJoin, fallback = "Training") {
  if (!value) return fallback;
  if (Array.isArray(value)) return value[0]?.title ?? fallback;
  return value.title || fallback;
}

async function loadReadableLeaderName(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data, error } = await supabase.rpc("father_leader_identity");
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const name = (row as { full_name?: unknown }).full_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function loadFatherCertificates(fatherId: string): Promise<IssuedCertificate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("id, serial_number, issued_at, issued_by, issuer_name, trainings(title)")
    .eq("father_id", fatherId)
    .order("issued_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    serial_number: string;
    issued_at: string;
    issued_by: string | null;
    issuer_name: string | null;
    trainings: TrainingJoin;
  }>;

  const issuerIds = [
    ...new Set(rows.map((row) => row.issued_by).filter((id): id is string => Boolean(id))),
  ];
  const issuersRes =
    issuerIds.length === 0
      ? { data: [] as Array<{ id: string; full_name: string | null }>, error: null }
      : await supabase.from("profiles").select("id, full_name").in("id", issuerIds);

  if (issuersRes.error) throw issuersRes.error;

  const issuers = new Map(
    (issuersRes.data ?? []).map((row) => [row.id, profileName(row, "")])
  );
  const leaderName = rows.some((row) => !row.issuer_name?.trim())
    ? await loadReadableLeaderName(supabase)
    : null;

  return rows.map((row) => ({
    id: row.id,
    serialNumber: row.serial_number,
    issuedAt: row.issued_at,
    trainingTitle: trainingTitle(row.trainings),
    issuerName: resolveCertificateIssuerName({
      storedName: row.issuer_name,
      profileName: row.issued_by ? issuers.get(row.issued_by) : null,
      leaderName,
    }),
  }));
}

export async function loadCertificatePayload(certificateId: string): Promise<{
  payload: CertificatePayload;
  storagePath: string | null;
  serialNumber: string;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("id, father_id, training_id, serial_number, issued_at, issued_by, issuer_name, pdf_storage_path")
    .eq("id", certificateId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const cert = data as CertificateRow;
  const [fatherRes, trainingRes, issuerRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", cert.father_id).maybeSingle(),
    supabase.from("trainings").select("id, title").eq("id", cert.training_id).maybeSingle(),
    cert.issued_by
      ? supabase.from("profiles").select("id, full_name").eq("id", cert.issued_by).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (fatherRes.error) throw fatherRes.error;
  if (trainingRes.error) throw trainingRes.error;
  if (issuerRes.error) throw issuerRes.error;

  const leaderName = cert.issuer_name?.trim()
    ? null
    : await loadReadableLeaderName(supabase);

  return {
    serialNumber: cert.serial_number,
    storagePath: cert.pdf_storage_path,
    payload: {
      fatherName: displayName(fatherRes.data, cert.father_id),
      trainingName: trainingRes.data?.title ?? "Training",
      completedOn: formatCertificateDate(cert.issued_at),
      serialNumber: cert.serial_number,
      managerName: resolveCertificateIssuerName({
        storedName: cert.issuer_name,
        profileName: profileName(issuerRes.data, ""),
        leaderName,
      }),
    },
  };
}

export async function loadCertificatePdfBytes(certificateId: string): Promise<{
  bytes: Uint8Array;
  serialNumber: string;
} | null> {
  const loaded = await loadCertificatePayload(certificateId);
  if (!loaded) return null;

  try {
    return {
      bytes: await renderCertificatePdf(loaded.payload),
      serialNumber: loaded.serialNumber,
    };
  } catch {
    if (!loaded.storagePath) return null;
    const supabase = await createClient();
    const { data } = await supabase.storage.from(CERTIFICATES_BUCKET).download(loaded.storagePath);
    if (!data) return null;
    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      serialNumber: loaded.serialNumber,
    };
  }
}
