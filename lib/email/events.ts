import "server-only";

import type { NotificationPrefKey } from "@/lib/account/preferences";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, renderTransactionalEmail, sendEmail } from "@/lib/email/send";

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
    await Promise.all([
      deliverIfAllowed(input.fatherId, "certificate_sent", {
        subject: `Your certificate is ready — ${input.serial}`,
        title: "Your certificate is ready.",
        body: `${input.trainingTitle} is complete. Serial ${input.serial}.\nSign in to download the PDF.`,
        ctaLabel: "View certificates",
        ctaHref: `${appUrl}/father/certificates`,
      }),
      deliverIfAllowed(input.managerId, "certificate_sent", {
        subject: `Certificate issued — ${input.serial}`,
        title: "Certificate sent.",
        body: `You issued ${input.serial} to ${input.fatherName} for ${input.trainingTitle}.`,
        ctaLabel: "Open participant",
        ctaHref: `${appUrl}/manager/participants/${input.fatherId}`,
      }),
    ]);
  } catch (error) {
    console.error("[email] certificate issued failed", error);
  }
}

export async function notifyTrainingAssigned(input: {
  fatherId: string;
  trainingTitle: string;
}) {
  try {
    const appUrl = getAppUrl();
    await deliverIfAllowed(input.fatherId, "new_trainings", {
      subject: `A training was assigned: ${input.trainingTitle}`,
      title: "A training is waiting.",
      body: `${input.trainingTitle} was assigned to you.\nOpen your trainings to begin the first session.`,
      ctaLabel: "Open trainings",
      ctaHref: `${appUrl}/father/trainings`,
    });
  } catch (error) {
    console.error("[email] training assigned failed", error);
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

async function sendWelcome(to: string) {
  const rendered = renderTransactionalEmail({
    title: "Your account is ready.",
    body: "Confirm your email if you were asked to, then sign in with the invite code your manager gave you.",
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
