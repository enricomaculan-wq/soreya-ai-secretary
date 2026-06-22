import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import {
  resetWhatsAppSignatureWarningsForTests,
  timingSafeHexEqual,
  verifyWhatsAppSignature,
} from "./whatsapp-webhook.ts";

describe("verifyWhatsAppSignature", () => {
  it("rejects invalid signatures when secret is configured", () => {
    const env = {
      NODE_ENV: "development",
      WHATSAPP_APP_SECRET: "test-secret",
    } as NodeJS.ProcessEnv;
    const body = '{"entry":[]}';
    const signature = `sha256=${createHmac("sha256", "test-secret").update(body, "utf8").digest("hex")}`;

    assert.equal(verifyWhatsAppSignature(body, signature, env).allowed, true);
    assert.equal(verifyWhatsAppSignature(body, "sha256=deadbeef", env).allowed, false);
  });

  it("requires secret in production", () => {
    resetWhatsAppSignatureWarningsForTests();

    const result = verifyWhatsAppSignature("{}", null, {
      NODE_ENV: "production",
      WHATSAPP_APP_SECRET: "",
    } as NodeJS.ProcessEnv);

    assert.equal(result.allowed, false);
  });
});

describe("timingSafeHexEqual", () => {
  it("compares hex digests safely", () => {
    assert.equal(timingSafeHexEqual("ab", "ab"), true);
    assert.equal(timingSafeHexEqual("ab", "ac"), false);
  });
});
