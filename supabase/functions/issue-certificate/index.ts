// Fathers.com : issue-certificate edge function (Deno / Supabase)
// SECURITY: runs with the service role. A certificate can ONLY be issued here,
// never from the browser, and ONLY after the enrollment provably meets every
// requirement. This prevents a user from forging a certificate for themselves.
//
// Deploy:  supabase functions deploy issue-certificate
// Call:    POST { enrollment_id }  (from a trusted context, or gated by admin)
//
// Requirements enforced before issuance:
//   1. ID verified at enrollment (id_verified_at is set)
//   2. Enough time logged for the course hours (seconds_logged >= hours * 3600 * 0.9)
//   3. Final assessment passed (passed_final = true)
//   4. Not already issued
//
// On success: mints a unique serial, writes the certificates row, marks the
// enrollment issued, and returns the serial. Optionally fires the issued email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// A readable, unique serial: FC-YYYY-NNNNNN
async function mintSerial(sb: any): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt++) {
    const n = Math.floor(100000 + Math.random() * 900000);
    const serial = `FC-${year}-${n}`;
    const { data } = await sb.from("certificates").select("id").eq("serial", serial).maybeSingle();
    if (!data) return serial;
  }
  throw new Error("Could not mint a unique serial");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const { enrollment_id } = await req.json();
    if (!enrollment_id) {
      return new Response(JSON.stringify({ error: "enrollment_id required" }), { status: 400 });
    }
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Pull the enrollment + its course + the recipient's display name.
    const { data: enr, error: enrErr } = await sb
      .from("certificate_enrollments")
      .select("id, user_id, course_id, id_verified_at, seconds_logged, passed_final, status")
      .eq("id", enrollment_id)
      .single();
    if (enrErr || !enr) {
      return new Response(JSON.stringify({ error: "Enrollment not found" }), { status: 404 });
    }
    if (enr.status === "issued") {
      return new Response(JSON.stringify({ error: "Already issued" }), { status: 409 });
    }

    const { data: course } = await sb
      .from("certificate_courses").select("title, hours").eq("id", enr.course_id).single();
    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), { status: 404 });
    }

    // ---- enforce every requirement ----
    const failures: string[] = [];
    if (!enr.id_verified_at) failures.push("identity not verified");
    const requiredSeconds = Math.floor(Number(course.hours) * 3600 * 0.9); // 90% of hours on task
    if ((enr.seconds_logged ?? 0) < requiredSeconds) failures.push("insufficient time logged");
    if (!enr.passed_final) failures.push("final assessment not passed");
    if (failures.length) {
      return new Response(JSON.stringify({ error: "Requirements not met", failures }), { status: 422 });
    }

    // recipient display: "First L." from the profile
    const { data: profile } = await sb
      .from("profiles").select("full_name").eq("id", enr.user_id).single();
    let display = "A Father";
    if (profile?.full_name) {
      const parts = String(profile.full_name).trim().split(/\s+/);
      display = parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : parts[0];
    }

    // ---- mint + issue ----
    const serial = await mintSerial(sb);
    const { data: cert, error: certErr } = await sb.from("certificates").insert({
      serial,
      enrollment_id: enr.id,
      recipient_display: display,
      course_title: course.title,
      hours: course.hours,
    }).select().single();
    if (certErr) throw certErr;

    await sb.from("certificate_enrollments").update({ status: "issued" }).eq("id", enr.id);

    return new Response(JSON.stringify({
      ok: true,
      serial: cert.serial,
      recipient: display,
      course: course.title,
      hours: course.hours,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
});
