import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { interactiveUnderlineClassName } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Terms of Service | Fathers.com",
  description: "The terms for using Fathers.com.",
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" updated="Last updated August 17, 2026">
      <LegalSection title="1. Agreement to terms">
        <p>
          By using Fathers.com, you agree to these terms. Fathers.com is a
          program of the National Center for Fathering, a 501(c)(3) nonprofit.
          If you do not agree, do not use the service. This page is a template
          for counsel review and is not a final agreement.
        </p>
      </LegalSection>

      <LegalSection title="2. Who can use Fathers.com">
        <p>
          You must be at least 18 years old to create an account. The service
          is built for fathers, future fathers, and mentors. Content is
          intended for adults.
        </p>
      </LegalSection>

      <LegalSection title="3. Your account and invite codes">
        <p>
          You create an account with an invite code from your organization
          administrator. You are responsible for your account and for keeping
          your sign-in secure. Do not share your password. Your Profile
          results, session notes, and assessments are yours; your manager can
          see the progress and responses described in the{" "}
          <Link
            href="/privacy"
            className={interactiveUnderlineClassName}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Father Profile and assessments">
        <p>
          The Father Profile (also called the Keystone Profile) is an
          educational assessment grounded in the published research of the
          National Center for Fathering. Custom assessments are written by
          your organization. Neither is a clinical, diagnostic, legal, or
          medical instrument, and results should not be used as a substitute
          for professional advice.
        </p>
      </LegalSection>

      <LegalSection title="5. Trainings and certificates">
        <p>
          Trainings include films, check-ins, and weekly actions. Certificates
          of Completion are issued by your manager after the stated
          requirements are met. Certificates attest to completion of a
          Fathers.com training. Acceptance by any court, agency, or program is
          at that body’s discretion; we do not guarantee acceptance. Do not
          forge or alter a certificate.
        </p>
      </LegalSection>

      <LegalSection title="6. Organizations and fees">
        <p>
          Access is through a participating organization. Any fees, if they
          exist, are between you and that organization. Fathers.com does not
          collect payment on these pages.
        </p>
      </LegalSection>

      <LegalSection title="7. Emails and notifications">
        <p>
          We may email you about assignments, certificates, and account
          security. You can change most notification preferences in Account.
          Turning a preference off means we will not send that message.
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <p>
          Do not misuse the service, attempt to forge certificates, share your
          account, upload unlawful content, or use the service to harm others.
          We may suspend accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Content and intellectual property">
        <p>
          The trainings, films, assessment, and materials on Fathers.com are
          owned by the National Center for Fathering or its licensors. You may
          use them for your own growth, not for redistribution.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers and limitation of liability">
        <p>
          The service is provided as is. To the fullest extent permitted by
          law, the National Center for Fathering is not liable for indirect or
          consequential damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these terms">
        <p>
          We may update these terms. Material changes will be posted here with
          a new date. Continued use after changes means you accept them.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Questions about these terms: contact your organization administrator,
          or reach Fathers.com at{" "}
          <a
            href="mailto:Team@Fathers.com"
            className={interactiveUnderlineClassName}
          >
            Team@Fathers.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
