import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeWebsiteFormSettings, parseWebsiteFormSettings } from "@soreya/shared/website-form";

describe("parseWebsiteFormSettings", () => {
  it("reads website form settings from organization settings", () => {
    const settings = parseWebsiteFormSettings({
      websiteForm: {
        enabled: true,
        ingestToken: "secret-token",
      },
    });

    assert.equal(settings.enabled, true);
    assert.equal(settings.ingestToken, "secret-token");
  });

  it("merges website form settings", () => {
    const merged = mergeWebsiteFormSettings({}, { enabled: true, ingestToken: "abc" });

    assert.deepEqual(merged, {
      websiteForm: {
        enabled: true,
        ingestToken: "abc",
      },
    });
  });
});
