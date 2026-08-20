import { headers } from "next/headers";

export const RATE_LIMITS = {
  "auth.signin": { limit: 10, windowMs: 15 * 60 * 1000 },
  "auth.signup": { limit: 5, windowMs: 60 * 60 * 1000 },
  "auth.leader_join": { limit: 5, windowMs: 60 * 60 * 1000 },
  "certificates.download": { limit: 30, windowMs: 5 * 60 * 1000 },
  "account.avatar": { limit: 8, windowMs: 15 * 60 * 1000 },
  "account.org_photo": { limit: 20, windowMs: 15 * 60 * 1000 },
  "manager.impact_export": { limit: 20, windowMs: 5 * 60 * 1000 },
  "manager.nudge": { limit: 12, windowMs: 15 * 60 * 1000 },
  "manager.bulk": { limit: 8, windowMs: 15 * 60 * 1000 },
  "manager.note": { limit: 20, windowMs: 15 * 60 * 1000 },
  "manager.review": { limit: 20, windowMs: 15 * 60 * 1000 },
  "manager.assessment": { limit: 20, windowMs: 15 * 60 * 1000 },
  "admin.release": { limit: 20, windowMs: 15 * 60 * 1000 },
  "admin.platform_photo": { limit: 12, windowMs: 15 * 60 * 1000 },
  "admin.support": { limit: 30, windowMs: 15 * 60 * 1000 },
  "admin.training_request": { limit: 30, windowMs: 15 * 60 * 1000 },
  "admin.sourcing": { limit: 20, windowMs: 15 * 60 * 1000 },
  "support.submit": { limit: 6, windowMs: 15 * 60 * 1000 },
  "manager.training_request": { limit: 8, windowMs: 15 * 60 * 1000 },
  "reviewer.summary_export": { limit: 20, windowMs: 5 * 60 * 1000 },
  "reviewer.insights_export": { limit: 20, windowMs: 5 * 60 * 1000 },
  "manager.reports_export": { limit: 20, windowMs: 5 * 60 * 1000 },
} as const;

export type RateLimitRoute = keyof typeof RATE_LIMITS;

const hits = new Map<string, number[]>();
let lastPrune = 0;

function prune(now: number) {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  const oldestKeep = now - 60 * 60 * 1000;
  for (const [key, times] of hits) {
    const kept = times.filter((time) => time > oldestKeep);
    if (kept.length === 0) hits.delete(key);
    else hits.set(key, kept);
  }
}

export function clientIpFromHeaders(headerList: Headers) {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || headerList.get("cf-connecting-ip") || "unknown";
}

export function allowRateLimit(route: RateLimitRoute, ip: string) {
  try {
    const { limit, windowMs } = RATE_LIMITS[route];
    const now = Date.now();
    prune(now);
    const key = `${route}:${ip}`;
    const recent = (hits.get(key) ?? []).filter((time) => time > now - windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  } catch (error) {
    console.error("[rate-limit] failed open", error);
    return true;
  }
}

export async function allowActionRateLimit(route: RateLimitRoute) {
  try {
    const headerList = await headers();
    return allowRateLimit(route, clientIpFromHeaders(headerList));
  } catch (error) {
    console.error("[rate-limit] failed open", error);
    return true;
  }
}

export function allowRequestRateLimit(route: RateLimitRoute, request: Request) {
  return allowRateLimit(route, clientIpFromHeaders(request.headers));
}
