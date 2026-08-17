// Simple in-memory rate limiter using globalThis for persistence across requests
// (Works in single-process environments; for multi-instance deployments use Redis)

interface RateEntry { count: number; resetAt: number; }

const globalForRateLimit = globalThis as unknown as {
  __omni_rate_map?: Map<string, RateEntry>;
  __omni_rate_cleanup?: ReturnType<typeof setInterval>;
};

if (!globalForRateLimit.__omni_rate_map) {
  globalForRateLimit.__omni_rate_map = new Map();
}
const rateMap = globalForRateLimit.__omni_rate_map;

// Cleanup every 5 minutes
if (!globalForRateLimit.__omni_rate_cleanup) {
  globalForRateLimit.__omni_rate_cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateMap) {
      if (now > v.resetAt) rateMap.delete(k);
    }
  }, 300_000);
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
