import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeTelegramSettings, parseTelegramSettings } from "@soreya/shared/telegram";

describe("parseTelegramSettings", () => {
  it("reads telegram settings from organization settings", () => {
    const settings = parseTelegramSettings({
      telegram: {
        enabled: true,
        webhookSecret: "secret-token",
        botTokenEncryptedRef: true,
      },
    });

    assert.equal(settings.enabled, true);
    assert.equal(settings.webhookSecret, "secret-token");
    assert.equal(settings.botTokenEncryptedRef, true);
  });

  it("merges telegram settings", () => {
    const merged = mergeTelegramSettings({}, { enabled: true, webhookSecret: "abc" });

    assert.deepEqual(merged, {
      telegram: {
        enabled: true,
        webhookSecret: "abc",
        botTokenEncryptedRef: false,
      },
    });
  });
});
