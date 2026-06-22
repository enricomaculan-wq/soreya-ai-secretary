import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  rateLimitEnabled,
  readRateLimitMaxRequests,
  readRateLimitWindowSeconds,
} from './rate-limit-config.ts';

describe('rateLimitEnabled', () => {
  it('is disabled when explicitly turned off', () => {
    assert.equal(rateLimitEnabled({ ENABLE_RATE_LIMIT: 'false' } as NodeJS.ProcessEnv), false);
  });

  it('is enabled in production by default', () => {
    assert.equal(
      rateLimitEnabled({ NODE_ENV: 'production', ENABLE_RATE_LIMIT: undefined } as NodeJS.ProcessEnv),
      true,
    );
  });

  it('reads sane defaults for window and max requests', () => {
    assert.equal(readRateLimitWindowSeconds({} as NodeJS.ProcessEnv), 60);
    assert.equal(readRateLimitMaxRequests({} as NodeJS.ProcessEnv), 60);
  });
});
