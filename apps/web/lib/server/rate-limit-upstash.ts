export type UpstashRateLimitConfig = {
  url: string;
  token: string;
};

export function readUpstashRateLimitConfig(env: NodeJS.ProcessEnv = process.env): UpstashRateLimitConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), token };
}

export async function incrementUpstashCounter(
  config: UpstashRateLimitConfig,
  key: string,
): Promise<number | null> {
  const response = await fetch(`${config.url}/incr/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => ({}))) as { result?: number };

  return typeof payload.result === "number" ? payload.result : null;
}
