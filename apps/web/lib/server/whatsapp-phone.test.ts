import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeWhatsAppRecipient } from './whatsapp-phone.ts';

describe('normalizeWhatsAppRecipient', () => {
  it('strips non-digits from phone numbers', () => {
    assert.equal(normalizeWhatsAppRecipient('+39 333 123 4567'), '393331234567');
  });

  it('throws when recipient is empty', () => {
    assert.throws(() => normalizeWhatsAppRecipient('   '), /missing/i);
  });
});
