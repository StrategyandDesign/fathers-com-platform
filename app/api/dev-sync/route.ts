import { NextResponse } from "next/server";

import { pullOnce } from "../../../scripts/live-preview/pull-once.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await pullOnce(process.cwd());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "sync failed" },
      { status: 500 }
    );
  }
}
