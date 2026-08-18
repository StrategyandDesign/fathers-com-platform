import { NextResponse } from "next/server";

import { evaluateClosedStreaks } from "@/lib/father/streak-admin";

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
    const result = await evaluateClosedStreaks();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron] streaks failed", error);
    return NextResponse.json({ ok: false, error: "evaluate_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
