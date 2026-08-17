import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { getI18n } from "@/lib/i18n/server";
import { interactiveUnderlineClassName } from "@/lib/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("legal.privacyPage.metaTitle"),
    description: t("legal.privacyPage.metaDescription"),
  };
}

export default async function PrivacyPage() {
  const { t } = await getI18n();

  return (
    <LegalDocument title={t("legal.privacyPage.title")} updated={t("legal.updated")}>
      <LegalSection title={t("legal.privacyPage.commitment")}>
        <p>{t("legal.privacyPage.commitmentBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.collect")}>
        <p>{t("legal.privacyPage.collectIntro")}</p>
        <ul className="list-disc space-y-2 ps-5">
          <li>{t("legal.privacyPage.collectEmail")}</li>
          <li>{t("legal.privacyPage.collectInvite")}</li>
          <li>{t("legal.privacyPage.collectProfile")}</li>
          <li>{t("legal.privacyPage.collectProgress")}</li>
          <li>{t("legal.privacyPage.collectTechnical")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.use")}>
        <p>{t("legal.privacyPage.useBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.emails")}>
        <p>{t("legal.privacyPage.emailsBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.analytics")}>
        <p>{t("legal.privacyPage.analyticsBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.notDo")}>
        <p>{t("legal.privacyPage.notDoBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.sharing")}>
        <p>{t("legal.privacyPage.sharingProviders")}</p>
        <p>{t("legal.privacyPage.sharingOrg")}</p>
        <p>{t("legal.privacyPage.sharingLegal")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.choices")}>
        <p>{t("legal.privacyPage.choicesBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.children")}>
        <p>{t("legal.privacyPage.childrenBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.retention")}>
        <p>{t("legal.privacyPage.retentionBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.security")}>
        <p>{t("legal.privacyPage.securityBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.stateRights")}>
        <p>{t("legal.privacyPage.stateRightsBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.changes")}>
        <p>{t("legal.privacyPage.changesBody")}</p>
      </LegalSection>

      <LegalSection title={t("legal.privacyPage.contact")}>
        <p>
          {t("legal.privacyPage.contactLead")}{" "}
          <a href="mailto:Team@Fathers.com" className={interactiveUnderlineClassName}>
            Team@Fathers.com
          </a>
          {t("legal.privacyPage.contactAlso")}{" "}
          <Link href="/terms" className={interactiveUnderlineClassName}>
            {t("legal.privacyPage.termsLink")}
          </Link>
          {t("legal.privacyPage.contactEnd")}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
