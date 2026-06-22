import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resetTelegramWebhookWarningsForTests,
  timingSafeStringEqual,
  verifyTelegramWebhookSecret,
} from "./telegram-webhook.ts";

describe("verifyTelegramWebhookSecret", () => {
  it("accepts matching organization or global secret", () => {
    const env = {
      NODE_ENV: "development",
      TELEGRAM_WEBHOOK_SECRET: "global-secret",
    } as NodeJS.ProcessEnv;

    assert.equal(verifyTelegramWebhookSecret("global-secret", "org-secret", env).allowed, true);
    assert.equal(verifyTelegramWebhookSecret("org-secret", "org-secret", env).allowed, true);
    assert.equal(verifyTelegramWebhookSecret("wrong-secret", "org-secret", env).allowed, false);
  });

  it("requires secret in production", () => {
    resetTelegramWebhookWarningsForTests();

    const result = verifyTelegramWebhookSecret(null, null, {
      NODE_ENV: "production",
      TELEGRAM_WEBHOOK_SECRET: "",
    } as NodeJS.ProcessEnv);

    assert.equal(result.allowed, false);
  });
});

describe("timingSafeStringEqual", () => {
  it("compares strings safely", () => {
    assert.equal(timingSafeStringEqual("abc", "abc"), true);
    assert.equal(timingSafeStringEqual("abc", "abd"), false);
  });
});
