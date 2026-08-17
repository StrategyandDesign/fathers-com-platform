import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { interactiveUnderlineClassName } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Privacy Policy | Fathers.com",
  description: "How Fathers.com handles your information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" updated="Last updated August 17, 2026">
      <LegalSection title="Our commitment">
        <p>
          Fathers.com is a program of the National Center for Fathering. Your
          account, Father Profile answers, session notes, assessments, and
          certificates are personal. We treat them with care and we do not sell
          them.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>When you use the service, we may collect:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The email and password you use to sign in.</li>
          <li>
            The invite code you enter, which places you in an organization
            group managed by your administrator.
          </li>
          <li>
            Your Father Profile answers and results, session check-in and
            action notes, and any custom assessments your manager assigns.
          </li>
          <li>
            Training progress, certificates your manager issues, an optional
            account photo, and the notification preferences you choose.
          </li>
          <li>
            Basic technical data needed to run the service, such as sign-in
            activity and error reports.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          We use this information to operate your account, deliver trainings,
          save your progress, issue certificates, and send the emails you have
          allowed. We do not use your assessment answers or session notes for
          advertising.
        </p>
      </LegalSection>

      <LegalSection title="Emails">
        <p>
          Fathers.com may send account and security messages, training
          assignments, and certificate notices. You can turn most of these off
          on your Account page. Account and security alerts may still be
          required to keep the service safe. Confirm and reset messages are
          sent through the sign-in provider.
        </p>
      </LegalSection>

      <LegalSection title="Analytics and error monitoring">
        <p>
          If error monitoring is enabled, we may use Sentry to record technical
          details such as the page you were on, browser type, and the error
          itself. That helps us keep the service reliable. We do not send your
          Profile answers, session notes, or assessment responses to Sentry as
          a matter of product design.
        </p>
      </LegalSection>

      <LegalSection title="What we do not do">
        <p>
          We do not sell your personal information. We do not share your
          individual Profile answers, session notes, or assessment responses
          with employers, courts, or programs unless you ask us to, or the law
          requires it. We do not use your reflections about your family for any
          purpose beyond serving you and the organization that invited you.
        </p>
      </LegalSection>

      <LegalSection title="Sharing">
        <p>
          We share data with service providers who help us run the platform
          (for example, hosting, file storage, email delivery, and error
          monitoring), under agreements that require them to protect it.
        </p>
        <p>
          If you join through an invite code, your organization administrator
          (manager) can see your name, photo if you upload one, training
          progress, Profile summary, custom assessment responses, and
          certificates. Reviewers see cohort totals only, not your name or
          individual answers. Super-admins operate the platform catalog and
          organizations; they are not a substitute for your organization
          administrator.
        </p>
        <p>
          If we receive a subpoena or court order, we are required to respond.
          We will tell you before we do unless the law forbids it. If you would
          rather not write something down, do not write it down; completion
          never depends on what you disclose in a free-text note.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can update your photo and notification preferences in Account.
          For access, correction, or deletion of your account and results,
          contact your organization administrator. They can reach Fathers.com
          on your behalf.
        </p>
      </LegalSection>

      <LegalSection title="Children’s privacy">
        <p>
          This service is built for adult fathers, future fathers, and mentors.
          You must be at least 18 years old to create an account. We do not
          knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          We keep your results, progress, and certificates while your account
          is active so you and your manager can use them. Photos and
          certificate files are stored in private buckets and are not public
          links. If you ask your organization administrator to delete your
          account, we remove personal data on a reasonable schedule, except
          where we must keep a record.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We protect your data with access controls, signed file downloads, and
          encryption in transit. Certificates and photos are not served as
          public URLs.
        </p>
      </LegalSection>

      <LegalSection title="State privacy rights">
        <p>
          Depending on where you live, you may have additional rights (for
          example, under California law) to access, delete, or restrict use of
          your information. Contact your organization administrator to exercise
          them.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy. Material changes will be posted here with
          a new date.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Privacy questions: contact your organization administrator, or reach
          Fathers.com at{" "}
          <a
            href="mailto:Team@Fathers.com"
            className={interactiveUnderlineClassName}
          >
            Team@Fathers.com
          </a>
          . See also the{" "}
          <Link
            href="/terms"
            className={interactiveUnderlineClassName}
          >
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
