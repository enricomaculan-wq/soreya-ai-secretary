import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addSettingsChannel,
  parseAddedSettingsChannels,
  removeSettingsChannel,
} from "@soreya/shared/settings-channels";

describe("settings channels", () => {
  it("reads added channels from organization settings", () => {
    assert.deepEqual(parseAddedSettingsChannels({ addedChannels: ["telegram", "email-google"] }), [
      "telegram",
      "email-google",
    ]);
    assert.deepEqual(parseAddedSettingsChannels(null), []);
  });

  it("adds and removes channels without duplicates", () => {
    const settings = { addedChannels: ["website-form"] };
    assert.deepEqual(addSettingsChannel(settings, "telegram"), ["website-form", "telegram"]);
    assert.deepEqual(addSettingsChannel(settings, "website-form"), ["website-form"]);
    assert.deepEqual(removeSettingsChannel(settings, "website-form"), []);
  });
});
