import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isWebsiteChatIngestEnabled,
  mergeWebsiteChatSettings,
  parseWebsiteChatSettings,
} from "@soreya/shared/website-chat";

describe("parseWebsiteChatSettings", () => {
  it("reads website chat settings from organization settings", () => {
    const settings = parseWebsiteChatSettings({
      websiteChat: {
        enabled: true,
      },
    });

    assert.equal(settings.enabled, true);
  });

  it("merges website chat settings", () => {
    const merged = mergeWebsiteChatSettings({}, { enabled: true });

    assert.deepEqual(merged, {
      websiteChat: {
        enabled: true,
      },
    });
  });

  it("requires chat enabled and form ingest token for ingest", () => {
    assert.equal(
      isWebsiteChatIngestEnabled({
        websiteChat: { enabled: true },
        websiteForm: { enabled: true, ingestToken: "secret" },
      }),
      true,
    );

    assert.equal(
      isWebsiteChatIngestEnabled({
        websiteChat: { enabled: false },
        websiteForm: { enabled: true, ingestToken: "secret" },
      }),
      false,
    );

    assert.equal(
      isWebsiteChatIngestEnabled({
        websiteChat: { enabled: true },
        websiteForm: { enabled: true, ingestToken: null },
      }),
      false,
    );
  });
});
