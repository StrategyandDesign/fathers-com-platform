import { execFileSync } from "node:child_process";

import { NextResponse } from "next/server";

import { loadSharedMark } from "@/lib/dev/shared-mark";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const shared = loadSharedMark();
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    return NextResponse.json({ sha, shared });
  } catch {
    return NextResponse.json({ sha: null, shared });
  }
}
