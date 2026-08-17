import { IssuedCertificateList } from "@/components/certificates/issued-list";
import { requireRole } from "@/lib/auth/session";
import { loadFatherCertificates } from "@/lib/certificates/data";

export default async function FatherCertificatesPage() {
  const { user } = await requireRole("father");
  const certificates = await loadFatherCertificates(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Certificates your manager has issued for completed trainings.
        </p>
      </div>
      <IssuedCertificateList
        certificates={certificates}
        empty="Finish a training, then your manager can issue a certificate. It will show up here."
        actionHref="/father/trainings"
        actionLabel="View trainings"
      />
    </div>
  );
}
