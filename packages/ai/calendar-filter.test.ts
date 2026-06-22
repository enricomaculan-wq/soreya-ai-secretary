import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterAvailabilitySlotsByRequiredDuration } from "./calendar.ts";

describe("filterAvailabilitySlotsByRequiredDuration", () => {
  it("drops slots shorter than the combined service duration", () => {
    const filtered = filterAvailabilitySlotsByRequiredDuration(
      [
        {
          startsAt: "2026-06-09T09:00:00.000Z",
          endsAt: "2026-06-09T10:00:00.000Z",
          durationMinutes: 60,
          provider: "all",
          calendarAccountId: null,
        },
        {
          startsAt: "2026-06-09T14:00:00.000Z",
          endsAt: "2026-06-09T15:30:00.000Z",
          durationMinutes: 90,
          provider: "all",
          calendarAccountId: null,
        },
      ],
      90,
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.durationMinutes, 90);
  });

  it("drops a single one-hour slot when the service needs ninety minutes", () => {
    const filtered = filterAvailabilitySlotsByRequiredDuration(
      [
        {
          startsAt: "2026-06-09T09:00:00.000Z",
          endsAt: "2026-06-09T10:00:00.000Z",
          durationMinutes: 60,
          provider: "all",
          calendarAccountId: null,
        },
      ],
      90,
    );

    assert.equal(filtered.length, 0);
  });
});
