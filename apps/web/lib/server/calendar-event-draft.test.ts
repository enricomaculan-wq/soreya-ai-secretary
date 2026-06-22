import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildEmailCalendarEventTitle,
  parseCalendarEventDraft,
} from "./calendar-event-draft.ts";

describe("parseCalendarEventDraft", () => {
  it("reads flat quick-call style payloads", () => {
    const parsed = parseCalendarEventDraft({
      provider: "google",
      title: "Igiene dentale - Mario Rossi",
      requestedStartsAt: "2026-06-16T13:00:00.000Z",
      requestedEndsAt: "2026-06-16T13:45:00.000Z",
      timezone: "Europe/Rome",
      customerEmail: "mario@example.com",
    });

    assert.equal(parsed?.title, "Igiene dentale - Mario Rossi");
    assert.equal(parsed?.startsAt, "2026-06-16T13:00:00.000Z");
    assert.equal(parsed?.customerEmail, "mario@example.com");
  });

  it("reads nested calendar proposal payloads", () => {
    const parsed = parseCalendarEventDraft({
      provider: "google",
      payload: {
        title: "Visita",
        startsAt: "2026-06-16T15:00:00+02:00",
        endsAt: "2026-06-16T15:30:00+02:00",
      },
    });

    assert.equal(parsed?.title, "Visita");
    assert.equal(parsed?.timezone, "Europe/Rome");
  });
});

describe("buildEmailCalendarEventTitle", () => {
  it("prefers service and customer name", () => {
    assert.equal(
      buildEmailCalendarEventTitle({ serviceName: "Igiene dentale", customerName: "Mario Rossi" }),
      "Igiene dentale - Mario Rossi",
    );
  });
});
