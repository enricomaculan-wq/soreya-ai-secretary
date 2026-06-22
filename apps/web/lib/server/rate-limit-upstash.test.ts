import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readUpstashRateLimitConfig } from './rate-limit-upstash.ts';

describe('readUpstashRateLimitConfig', () => {
  it('returns null when Upstash env vars are missing', () => {
    assert.equal(readUpstashRateLimitConfig({} as NodeJS.ProcessEnv), null);
  });

  it('returns config when Upstash env vars are set', () => {
    const config = readUpstashRateLimitConfig({
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    } as NodeJS.ProcessEnv);

    assert.deepEqual(config, {
      url: 'https://example.upstash.io',
      token: 'token',
    });
  });
});
