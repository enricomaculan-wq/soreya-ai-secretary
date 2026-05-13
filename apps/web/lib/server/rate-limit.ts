type RateLimitOptions = {
  route: string;
  limit?: number;
  windowSeconds?: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export type RateLimitResult = {
  allowed: boolean;
  key: string;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  const limit = options.limit ?? readRateLimitMaxRequests();
  const windowSeconds = options.windowSeconds ?? readRateLimitWindowSeconds();
  const key = `${clientIp(request)}:${options.route}`;
  const now = Date.now();

  if (!rateLimitEnabled() || limit <= 0 || windowSeconds <= 0) {
    return { allowed: true, key, limit, remaining: limit, resetAt: now };
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    buckets.set(key, { count: 1, resetAt });
    cleanupExpiredBuckets(now);

    return { allowed: true, key, limit, remaining: Math.max(0, limit - 1), resetAt };
  }

  existing.count += 1;

  return {
    allowed: existing.count <= limit,
    key,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    {
      error: "Too many requests.",
      retryAfterSeconds: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

export function rateLimitEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ENABLE_RATE_LIMIT === "true";
}

export function readRateLimitWindowSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.RATE_LIMIT_WINDOW_SECONDS);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60;
}

export function readRateLimitMaxRequests(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.RATE_LIMIT_MAX_REQUESTS);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60;
}

function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwardedFor
    || request.headers.get("x-real-ip")?.trim()
    || request.headers.get("cf-connecting-ip")?.trim()
    || "unknown";
}

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
