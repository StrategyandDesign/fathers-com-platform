import { execFileSync } from "node:child_process";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    return NextResponse.json({ sha });
  } catch {
    return NextResponse.json({ sha: null });
  }
}
