import "server-only";

export function getAppUrl() {
  const raw =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function isEmailConfigured() {
  if (!process.env.RESEND_API_KEY) return false;
  const provider = (process.env.EMAIL_PROVIDER ?? "resend").toLowerCase();
  return provider === "resend";
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function renderTransactionalEmail({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const paragraphs = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const textLines = [title, "", ...paragraphs];
  if (ctaLabel && ctaHref) {
    textLines.push("", `${ctaLabel}: ${ctaHref}`);
  }
  textLines.push("", "Fathers.com — National Center for Fathering");

  const htmlBody = paragraphs
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3a352e;">${escapeHtml(line)}</p>`
    )
    .join("");
  const cta = ctaLabel && ctaHref
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr><td style="background:#c45c26;border-radius:999px;"><a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#fff8f0;text-decoration:none;">${escapeHtml(ctaLabel)}</a></td></tr></table>`
    : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#e9e3d7;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e3d7;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#f4f0e8;border-radius:8px;">
<tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6257;">Fathers.com</td></tr>
<tr><td style="padding:8px 32px 32px;">
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#141210;">${escapeHtml(title)}</h1>
${htmlBody}
${cta}
</td></tr>
</table>
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding:20px 32px;font-size:12px;line-height:1.6;color:#8a8378;">Fathers.com is a program of the National Center for Fathering.</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { html, text: textLines.join("\n") };
}

export async function sendEmail(input: SendEmailInput) {
  if (!isEmailConfigured()) return { sent: false as const, reason: "not_configured" };

  const from =
    process.env.EMAIL_FROM || "Fathers.com <noreply@mail.fathers.com>";
  const apiKey = process.env.RESEND_API_KEY as string;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[email] Resend rejected the message", response.status, detail);
      return { sent: false as const, reason: "provider_error" };
    }

    return { sent: true as const };
  } catch (error) {
    console.error("[email] send failed", error);
    return { sent: false as const, reason: "network_error" };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
