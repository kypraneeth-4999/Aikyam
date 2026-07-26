/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * Note: on serverless (Netlify functions) memory is per-instance, so this is a
 * soft guard, not a hard limit — back it with Upstash/Redis for strict limits.
 * OTP rate-limiting is handled by Supabase Auth, not here.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}
