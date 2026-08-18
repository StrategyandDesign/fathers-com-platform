import "server-only";

import type { NotificationPrefKey } from "@/lib/account/preferences";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, renderTransactionalEmail, sendEmail } from "@/lib/email/send";
import type { NudgeTemplate } from "@/lib/manager/nudges";

type Recipient = {
  email: string;
  allowed: boolean;
};

async function loadRecipient(userId: string, prefKey: NotificationPrefKey) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("notification_recipient", {
      target_user_id: userId,
      pref_key: prefKey,
    });
    if (error) {
      console.error("[email] recipient lookup failed", prefKey, error.message);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as Recipient | null;
    if (!row?.email) return null;
    return { email: row.email, allowed: Boolean(row.allowed) };
  } catch (error) {
    console.error("[email] recipient lookup failed", prefKey, error);
    return null;
  }
}

async function deliverIfAllowed(
  userId: string,
  prefKey: NotificationPrefKey,
  message: { subject: string; title: string; body: string; ctaLabel: string; ctaHref: string }
) {
  const recipient = await loadRecipient(userId, prefKey);
  if (!recipient || !recipient.allowed) return;
  const rendered = renderTransactionalEmail({
    title: message.title,
    body: message.body,
    ctaLabel: message.ctaLabel,
    ctaHref: message.ctaHref,
  });
  await sendEmail({
    to: recipient.email,
    subject: message.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

export async function notifyCertificateIssued(input: {
  fatherId: string;
  managerId: string;
  fatherName: string;
  trainingTitle: string;
  serial: string;
}) {
  try {
    const appUrl = getAppUrl();
    await deliverIfAllowed(input.managerId, "certificate_sent", {
      subject: `Certificate issued. ${input.serial}`,
      title: "Certificate sent.",
      body: `You issued ${input.serial} to ${input.fatherName} for ${input.trainingTitle}.`,
      ctaLabel: "Open participant",
      ctaHref: `${appUrl}/manager/participants/${input.fatherId}`,
    });
  } catch (error) {
    console.error("[email] certificate issued failed", error);
  }
}

export async function notifyAssessmentReleased(input: {
  managerId: string;
  assessmentKey: string;
  assessmentTitle: string;
}): Promise<"sent" | "skipped" | "failed"> {
  try {
    const recipient = await loadRecipient(input.managerId, "assessment_releases");
    if (!recipient) return "failed";
    if (!recipient.allowed) return "skipped";

    const appUrl = getAppUrl();
    const rendered = renderTransactionalEmail({
      title: "A new assessment is available for your review",
      body: `${input.assessmentTitle} is ready for your organization.\nAccept it if you want to offer it, then share it with fathers when you want them to take it.`,
      ctaLabel: "Review assessment",
      ctaHref: `${appUrl}/manager/assessment-reviews/${input.assessmentKey}`,
    });
    const result = await sendEmail({
      to: recipient.email,
      subject: "A new assessment is available for your review",
      html: rendered.html,
      text: rendered.text,
    });
    if (result.sent) return "sent";
    if (result.reason === "not_configured") return "skipped";
    console.error("[email] assessment released failed", result.reason);
    return "failed";
  } catch (error) {
    console.error("[email] assessment released failed", error);
    return "failed";
  }
}

export async function notifyTrainingReleased(input: {
  managerId: string;
  trainingId: string;
  trainingTitle: string;
}): Promise<"sent" | "skipped" | "failed"> {
  try {
    const recipient = await loadRecipient(input.managerId, "training_releases");
    if (!recipient) return "failed";
    if (!recipient.allowed) return "skipped";

    const appUrl = getAppUrl();
    const rendered = renderTransactionalEmail({
      title: "A new training is available for your review",
      body: `${input.trainingTitle} is ready for your organization.\nPreview it, then accept to make it available to assign, or decline to keep it hidden. Fathers are not enrolled until you assign it.`,
      ctaLabel: "Review training",
      ctaHref: `${appUrl}/manager/reviews/${input.trainingId}`,
    });
    const result = await sendEmail({
      to: recipient.email,
      subject: "A new training is available for your review",
      html: rendered.html,
      text: rendered.text,
    });
    if (result.sent) return "sent";
    if (result.reason === "not_configured") return "skipped";
    console.error("[email] training released failed", result.reason);
    return "failed";
  } catch (error) {
    console.error("[email] training released failed", error);
    return "failed";
  }
}

export async function notifyAccountCreated(input: {
  email: string;
  userId?: string | null;
}) {
  try {
    if (input.userId) {
      const recipient = await loadRecipient(input.userId, "account_security_alerts");
      if (recipient && !recipient.allowed) return;
      if (recipient?.allowed) {
        await sendWelcome(recipient.email);
        return;
      }
    }

    await sendWelcome(input.email);
  } catch (error) {
    console.error("[email] account created failed", error);
  }
}

export async function notifyManagerNudge(input: {
  fatherId: string;
  organizationName: string;
  template: NudgeTemplate;
}) {
  const recipient = await loadRecipient(input.fatherId, "leader_encouragement");
  if (!recipient) return { status: "failed" as const };
  if (!recipient.allowed) return { status: "skipped_pref" as const };

  const rendered = renderTransactionalEmail({
    title: input.template.title,
    body: input.template.body(input.organizationName),
    ctaLabel: input.template.ctaLabel,
    ctaHref: `${getAppUrl()}/father`,
  });
  const result = await sendEmail({
    to: recipient.email,
    subject: input.template.subject,
    html: rendered.html,
    text: rendered.text,
  });
  return { status: result.sent ? ("sent" as const) : ("failed" as const) };
}

async function sendWelcome(to: string) {
  const rendered = renderTransactionalEmail({
    title: "Your account is ready.",
    body: "Confirm your email if you were asked to, then sign in with your email and password.",
    ctaLabel: "Sign in",
    ctaHref: `${getAppUrl()}/login`,
  });
  await sendEmail({
    to,
    subject: "Your Fathers.com account is ready",
    html: rendered.html,
    text: rendered.text,
  });
}
