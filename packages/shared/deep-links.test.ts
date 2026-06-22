import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SOREYA_DEEP_LINKS } from "@soreya/shared/deep-links";

describe('SOREYA_DEEP_LINKS', () => {
  it('uses soreya:// scheme for all routes', () => {
    for (const link of Object.values(SOREYA_DEEP_LINKS)) {
      assert.match(link, /^soreya:\/\//);
    }
  });

  it('includes core product screens', () => {
    assert.equal(SOREYA_DEEP_LINKS.approvals, 'soreya://approvals');
    assert.equal(SOREYA_DEEP_LINKS.dailySummary, 'soreya://daily-summary');
    assert.equal(SOREYA_DEEP_LINKS.emergency, 'soreya://emergency');
    assert.equal(SOREYA_DEEP_LINKS.quickCall, 'soreya://quick-call');
  });
});
