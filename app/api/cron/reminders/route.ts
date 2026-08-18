import { NextResponse } from "next/server";

import { dispatchDueReminders } from "@/lib/notifications/dispatch";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const alt = request.headers.get("x-cron-secret") ?? "";
  return header === `Bearer ${secret}` || alt === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await dispatchDueReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron] reminders failed", error);
    return NextResponse.json({ ok: false, error: "dispatch_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
