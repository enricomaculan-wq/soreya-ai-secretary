import type { Json } from "./json.ts";

export type WebsiteFormSettings = {
  enabled: boolean;
  ingestToken: string | null;
};

export const DEFAULT_WEBSITE_FORM_SETTINGS: WebsiteFormSettings = {
  enabled: false,
  ingestToken: null,
};

export function parseWebsiteFormSettings(settings: Json | null | undefined): WebsiteFormSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return DEFAULT_WEBSITE_FORM_SETTINGS;
  }

  const record = settings as Record<string, Json | undefined>;
  const websiteForm = record.websiteForm;

  if (!websiteForm || typeof websiteForm !== "object" || Array.isArray(websiteForm)) {
    return DEFAULT_WEBSITE_FORM_SETTINGS;
  }

  const form = websiteForm as Record<string, Json | undefined>;

  return {
    enabled: form.enabled === true,
    ingestToken: typeof form.ingestToken === "string" && form.ingestToken.trim().length > 0
      ? form.ingestToken.trim()
      : null,
  };
}

export function mergeWebsiteFormSettings(
  settings: Json | null | undefined,
  patch: Partial<WebsiteFormSettings>,
): Json {
  const current = parseWebsiteFormSettings(settings);

  return {
    ...(settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {}),
    websiteForm: {
      enabled: patch.enabled ?? current.enabled,
      ingestToken: patch.ingestToken !== undefined ? patch.ingestToken : current.ingestToken,
    },
  };
}
