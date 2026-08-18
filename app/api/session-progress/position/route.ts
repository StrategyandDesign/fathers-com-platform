import { getAuthContext } from "@/lib/auth/session";
import { writeFilmSeconds } from "@/lib/father/film-position";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ ok: false }, { status: 403 });
  }

  const { user, role, deactivated } = await getAuthContext();
  if (deactivated || !user || role !== "father") {
    return Response.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { sessionId?: unknown; seconds?: unknown }
    | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const seconds = typeof body?.seconds === "number" ? body.seconds : Number(body?.seconds);

  const result = await writeFilmSeconds(user.id, sessionId, seconds);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
