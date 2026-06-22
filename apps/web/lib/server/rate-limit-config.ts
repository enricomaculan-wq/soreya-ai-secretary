export function rateLimitEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ENABLE_RATE_LIMIT === "false") {
    return false;
  }

  if (env.ENABLE_RATE_LIMIT === "true") {
    return true;
  }

  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

export function readRateLimitWindowSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.RATE_LIMIT_WINDOW_SECONDS);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60;
}

export function readRateLimitMaxRequests(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.RATE_LIMIT_MAX_REQUESTS);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60;
}
