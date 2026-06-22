import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeTelegramChatId, normalizeTelegramRecipient } from "./telegram-chat-id.ts";

describe("normalizeTelegramChatId", () => {
  it("normalizes numeric chat ids", () => {
    assert.equal(normalizeTelegramChatId(123456789), "123456789");
    assert.equal(normalizeTelegramChatId("123456789"), "123456789");
    assert.equal(normalizeTelegramChatId("-1001234567890"), "-1001234567890");
  });

  it("rejects invalid chat ids", () => {
    assert.throws(() => normalizeTelegramChatId("not-a-chat-id"), /numeric string/);
  });
});

describe("normalizeTelegramRecipient", () => {
  it("delegates to chat id normalization", () => {
    assert.equal(normalizeTelegramRecipient("42"), "42");
  });
});
