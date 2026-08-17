import { IssuedCertificateList } from "@/components/certificates/issued-list";
import { requireRole } from "@/lib/auth/session";
import { loadFatherCertificates } from "@/lib/certificates/data";
import { getI18n } from "@/lib/i18n/server";

export default async function FatherCertificatesPage() {
  const { user } = await requireRole("father");
  const [{ t }, certificates] = await Promise.all([
    getI18n(),
    loadFatherCertificates(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("account.certificates")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("account.certificatesLead")}
        </p>
      </div>
      <IssuedCertificateList
        certificates={certificates}
        empty={t("account.certificatesEmpty")}
        actionHref="/father/trainings"
        actionLabel={t("account.viewTrainings")}
      />
    </div>
  );
}
