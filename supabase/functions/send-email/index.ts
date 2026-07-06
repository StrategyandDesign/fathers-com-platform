// Fathers.com : send-email edge function (Deno / Supabase)
// Deploy:  supabase functions deploy send-email
// Secret:  supabase secrets set RESEND_API_KEY=re_...
// Call:    POST { to, template, data } or { to, subject, html }

const SUBJECTS: Record<string, string> = {
  "01-welcome": "Your baseline is saved.",
  "02-weekly-plan": "Week 3: show up on schedule.",
  "03-missed-week": "Week 4 is still on the table.",
  "04-gift-receipt": "Your gift is set for June 21.",
  "05-gift-delivery": "{{FROM_NAME}} sent you a year of Fathers.com.",
  "06-renewal": "Your membership renews March 4.",
  "07-win-back": "New class: Raising Teens.",
  "08-certificate-issued": "Your certificate is ready. Serial {{SERIAL}}.",
  "09-leader-digest": "Your Circle this week: {{WATCHED}} of {{TOTAL}} watched.",
  "org-invite": "You have a seat on Fathers.com.",
};

// Minimal inlined bodies for the two highest-frequency sends.
// For the full designs, load emails/*.html from Supabase Storage
// (bucket: email-templates) or paste them into this map.
const BODIES: Record<string, string> = {
  "03-missed-week": `<div style="font-family:Helvetica,Arial,sans-serif;background:#F4F0E8;padding:36px;border-radius:8px;max-width:600px">
<h1 style="font-family:Georgia,serif;font-size:26px;color:#141210;margin:0 0 14px">Week 4 is still on the table.</h1>
<p style="font-size:15px;color:#3a352e;line-height:1.6">You went quiet last week. It happens.</p>
<p style="font-size:15px;color:#3a352e;line-height:1.6">The plan does not care about perfect. It cares about next.</p>
<p style="font-size:15px;color:#3a352e;line-height:1.6">Week 4 takes 25 minutes total.</p>
<a href="{{PLAN_URL}}" style="display:inline-block;background:#E86A3C;color:#0A0A0A;padding:14px 26px;border-radius:6px;font-weight:bold;text-decoration:none">Pick it back up</a></div>`,
  "org-invite": `<div style="font-family:Helvetica,Arial,sans-serif;background:#F4F0E8;padding:36px;border-radius:8px;max-width:600px">
<h1 style="font-family:Helvetica,Arial,sans-serif;font-weight:600;font-size:25px;color:#141210;margin:0 0 14px">You have a seat on Fathers.com.</h1>
<p style="font-size:15px;color:#3a352e;line-height:1.6">{{ORG}} gave you a seat. Take your baseline, get your plan, and join your Circle.</p>
<a href="{{JOIN_URL}}" style="display:inline-block;background:#E86A3C;color:#0A0A0A;padding:14px 26px;border-radius:6px;font-weight:bold;text-decoration:none">Claim your seat</a></div>`,
  "01-welcome": `<div style="font-family:Helvetica,Arial,sans-serif;background:#F4F0E8;padding:36px;border-radius:8px;max-width:600px">
<h1 style="font-family:Georgia,serif;font-size:26px;color:#141210;margin:0 0 14px">Your baseline is saved.</h1>
<p style="font-size:15px;color:#3a352e;line-height:1.6">Presence Baseline: <b style="font-family:Courier,monospace">{{BASELINE}}</b></p>
<p style="font-size:15px;color:#3a352e;line-height:1.6">Week 1 is ready when you are. One lesson, two actions, 25 minutes total.</p>
<a href="{{PLAN_URL}}" style="display:inline-block;background:#E86A3C;color:#0A0A0A;padding:14px 26px;border-radius:6px;font-weight:bold;text-decoration:none">Start Week 1</a></div>`,
};

function fill(s: string, data: Record<string, string>): string {
  return s.replace(/{{(\w+)}}/g, (_, k) => data[k] ?? "");
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { to, template, data = {}, subject, html } = await req.json();
    if (!to) throw new Error("Missing 'to'.");

    const finalSubject = subject ?? fill(SUBJECTS[template] ?? "Fathers.com", data);
    const finalHtml = html ?? fill(BODIES[template] ?? "", data);
    if (!finalHtml) throw new Error(`No body for template '${template}'. Inline it or pass html.`);

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fathers.com <plan@updates.fathers.com>",
        to,
        subject: finalSubject,
        html: finalHtml,
      }),
    });
    const out = await r.json();
    return new Response(JSON.stringify(out), {
      status: r.ok ? 200 : 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

// Appended templates: org invite (referenced by org.js)
// Add to SUBJECTS / BODIES maps above when integrating, or handle here:
//   "org-invite": subject "You have a seat on Fathers.com", body links to {{JOIN_URL}}.
