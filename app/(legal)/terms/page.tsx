import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName } from "@/lib/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("legal.termsPage.metaTitle"),
    description: t("legal.termsPage.metaDescription"),
  };
}

export default async function TermsPage() {
  const { t } = await getI18n();

  return (
    <LegalDocument title={t("legal.termsPage.title")} updated={t("legal.updated")}>
      <LegalSection title={t("legal.termsPage.agreement")}>
        <p>{t("legal.termsPage.agreementBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.who")}>
        <p>{t("legal.termsPage.whoBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.account")}>
        <p>
          {t("legal.termsPage.accountLead")}
          <Link href="/privacy" className={interactiveUnderlineClassName}>
            {t("legal.termsPage.privacyLink")}
          </Link>
          {t("legal.termsPage.accountEnd")}
        </p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.profile")}>
        <p>{t("legal.termsPage.profileBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.trainings")}>
        <p>{t("legal.termsPage.trainingsBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.fees")}>
        <p>{t("legal.termsPage.feesBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.emails")}>
        <p>{t("legal.termsPage.emailsBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.use")}>
        <p>{t("legal.termsPage.useBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.ip")}>
        <p>{t("legal.termsPage.ipBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.liability")}>
        <p>{t("legal.termsPage.liabilityBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.changes")}>
        <p>{t("legal.termsPage.changesBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.termsPage.contact")}>
        <p>
          {t("legal.termsPage.contactLead")}{" "}
          <a href="mailto:Team@Fathers.com" className={interactiveUnderlineClassName}>
            Team@Fathers.com
          </a>
          {t("legal.termsPage.contactEnd")}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
