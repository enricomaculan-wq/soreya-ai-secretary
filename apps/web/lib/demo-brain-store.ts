"use client";

import type { OrganizationBrainSettings, OrganizationService, SupportedLocale } from "@soreya/shared";
import { getDemoBrainContext } from "@soreya/shared";

const STORAGE_KEY = "soreya-demo-brain-overrides";

type DemoBrainOverrides = {
  settings?: OrganizationBrainSettings;
  services?: OrganizationService[];
};

function readOverrides(): DemoBrainOverrides | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoBrainOverrides) : null;
  } catch {
    return null;
  }
}

function writeOverrides(overrides: DemoBrainOverrides) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function readDemoBrainOverrides(locale: SupportedLocale) {
  const stored = readOverrides();
  const seed = getDemoBrainContext(locale);

  return {
    settings: stored?.settings ?? seed.settings,
    services: stored?.services?.length ? stored.services : seed.services,
  };
}

export function saveDemoBrainSettings(settings: OrganizationBrainSettings) {
  const current = readOverrides() ?? {};
  writeOverrides({ ...current, settings });
}

export function saveDemoBrainServices(services: OrganizationService[]) {
  const current = readOverrides() ?? {};
  writeOverrides({ ...current, services });
}
