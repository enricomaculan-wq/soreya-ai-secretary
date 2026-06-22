import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildWebsiteInboundNotificationPayload,
  truncateWebsiteInboundSnippet,
} from "./website-inbound-notifications.ts";

describe("buildWebsiteInboundNotificationPayload", () => {
  it("builds Italian form notification copy", () => {
    const payload = buildWebsiteInboundNotificationPayload("form", "Vorrei un appuntamento");

    assert.equal(payload.type, "appointment_request_detected");
    assert.equal(payload.title, "Nuova richiesta dal form sito");
    assert.equal(payload.body, "Vorrei un appuntamento");
  });

  it("builds Italian chat notification copy", () => {
    const payload = buildWebsiteInboundNotificationPayload("chat", "Buongiorno, avete posto domani?");

    assert.equal(payload.type, "appointment_request_detected");
    assert.equal(payload.title, "Nuovo messaggio in chat sito");
    assert.equal(payload.body, "Buongiorno, avete posto domani?");
  });
});

describe("truncateWebsiteInboundSnippet", () => {
  it("truncates long snippets with an ellipsis", () => {
    const snippet = "a".repeat(140);
    const truncated = truncateWebsiteInboundSnippet(snippet, 120);

    assert.equal(truncated.length, 120);
    assert.match(truncated, /…$/);
  });

  it("falls back when the snippet is empty", () => {
    assert.equal(truncateWebsiteInboundSnippet("   "), "Nuovo messaggio in arrivo.");
  });
});
