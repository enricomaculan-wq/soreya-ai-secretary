import {
  rateLimitEnabled,
  readRateLimitMaxRequests,
  readRateLimitWindowSeconds,
} from "./rate-limit-config";
import { incrementUpstashCounter, readUpstashRateLimitConfig } from "./rate-limit-upstash";

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
  return checkRateLimitInMemory(request, options);
}

export async function checkRateLimitAsync(request: Request, options: RateLimitOptions): Promise<RateLimitResult> {
  const limit = options.limit ?? readRateLimitMaxRequests();
  const windowSeconds = options.windowSeconds ?? readRateLimitWindowSeconds();
  const now = Date.now();

  if (!rateLimitEnabled() || limit <= 0 || windowSeconds <= 0) {
    return {
      allowed: true,
      key: buildRateLimitKey(request, options, now, windowSeconds),
      limit,
      remaining: limit,
      resetAt: now,
    };
  }

  const upstash = readUpstashRateLimitConfig();

  if (upstash) {
    const key = buildRateLimitKey(request, options, now, windowSeconds);
    const count = await incrementUpstashCounter(upstash, key);
    const resetAt = Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000;

    if (count !== null) {
      return {
        allowed: count <= limit,
        key,
        limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    }
  }

  return checkRateLimitInMemory(request, options);
}

function checkRateLimitInMemory(request: Request, options: RateLimitOptions): RateLimitResult {
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

function buildRateLimitKey(
  request: Request,
  options: RateLimitOptions,
  now: number,
  windowSeconds: number,
) {
  const windowBucket = Math.floor(now / (windowSeconds * 1000));

  return `rl:${windowBucket}:${clientIp(request)}:${options.route}`;
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

export { rateLimitEnabled, readRateLimitMaxRequests, readRateLimitWindowSeconds } from "./rate-limit-config";

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
