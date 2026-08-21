import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { loadManagerDeskSyncVersion } from "@/lib/manager/desk-sync-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, role } = await getAuthContext();
  if (!user || role !== "manager") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const version = await loadManagerDeskSyncVersion(user.id);
  return NextResponse.json(
    { version },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
