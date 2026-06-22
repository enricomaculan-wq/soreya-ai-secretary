import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isProtectedDemoApiPath,
  isProtectedPagePath,
  shouldBypassDemoAccessInDevelopment,
} from './demo-access.ts';

describe('shouldBypassDemoAccessInDevelopment', () => {
  it('allows bypass only in local development without password', () => {
    assert.equal(
      shouldBypassDemoAccessInDevelopment(),
      process.env.NODE_ENV === 'development'
        && process.env.VERCEL_ENV !== 'preview'
        && process.env.VERCEL_ENV !== 'production'
        && !process.env.DEMO_ACCESS_PASSWORD,
    );
  });

  it('never bypasses when VERCEL_ENV is production', () => {
    const previous = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'production';

    try {
      assert.equal(shouldBypassDemoAccessInDevelopment(), false);
    } finally {
      if (previous === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = previous;
      }
    }
  });
});

describe('protected paths', () => {
  it('protects dashboard and core APIs', () => {
    assert.equal(isProtectedPagePath('/dashboard'), true);
    assert.equal(isProtectedDemoApiPath('/api/execution/preview'), true);
    assert.equal(isProtectedDemoApiPath('/api/inbox/messages'), true);
    assert.equal(isProtectedDemoApiPath('/api/privacy/export'), true);
  });
});
