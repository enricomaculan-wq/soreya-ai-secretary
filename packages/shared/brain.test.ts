import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_ORGANIZATION_BRAIN_SETTINGS,
  formatServiceDuration,
  formatServicePrice,
  parseEuroPriceInputToCents,
  parseOrganizationBrainSettings,
  readMatchedServicesFromConstraints,
  readMatchedServiceFromConstraints,
  resolveCombinedServiceDurationMinutes,
} from "@soreya/shared/brain";

describe("parseOrganizationBrainSettings", () => {
  it("reads brain settings from organization settings json", () => {
    const settings = parseOrganizationBrainSettings({
      brain: {
        reasoningMode: "proactive",
        defaultReplyTone: "friendly",
        requireServiceBeforeSlots: true,
        requireExplicitDate: false,
        ownerStyleNotes: "Tono caldo ma professionale",
      },
    });

    assert.equal(settings.reasoningMode, "proactive");
    assert.equal(settings.defaultReplyTone, "friendly");
    assert.equal(settings.requireServiceBeforeSlots, true);
    assert.equal(settings.ownerStyleNotes, "Tono caldo ma professionale");
  });

  it("falls back to defaults for invalid payloads", () => {
    const settings = parseOrganizationBrainSettings(null);

    assert.deepEqual(settings, DEFAULT_ORGANIZATION_BRAIN_SETTINGS);
  });
});

describe("service formatting helpers", () => {
  it("formats price and duration for customer replies", () => {
    assert.equal(
      formatServicePrice({ priceCents: 8000, currency: "EUR" }, "it-IT"),
      "80,00 €",
    );
    assert.equal(formatServiceDuration(45, "it-IT"), "45 min");
    assert.equal(formatServiceDuration(90, "it-IT"), "1 h 30 min");
  });

  it("reads matched service metadata from extracted constraints", () => {
    const matched = readMatchedServiceFromConstraints({
      matchedService: {
        id: "svc-1",
        name: "Igiene dentale",
        slug: "igiene",
        durationMinutes: 45,
        priceCents: 8000,
        currency: "EUR",
        matchScore: 0.9,
        matchedBy: "alias",
      },
    });

    assert.equal(matched?.id, "svc-1");
    assert.equal(matched?.durationMinutes, 45);
  });

  it("sums durations for multiple matched services", () => {
    const services = readMatchedServicesFromConstraints({
      matchedServices: [
        {
          id: "svc-1",
          name: "Igiene dentale",
          slug: "igiene",
          durationMinutes: 45,
          priceCents: 8000,
          currency: "EUR",
          matchScore: 0.9,
          matchedBy: "alias",
        },
        {
          id: "svc-2",
          name: "Visita di controllo",
          slug: "visita",
          durationMinutes: 30,
          priceCents: 5000,
          currency: "EUR",
          matchScore: 0.9,
          matchedBy: "alias",
        },
      ],
      requiredDurationMinutes: 75,
    });

    assert.equal(services.length, 2);
    assert.equal(resolveCombinedServiceDurationMinutes(services), 75);
  });

  it("parses euro price input into cents", () => {
    assert.equal(parseEuroPriceInputToCents("80"), 8000);
    assert.equal(parseEuroPriceInputToCents("80,50"), 8050);
    assert.equal(parseEuroPriceInputToCents(""), null);
  });
});
