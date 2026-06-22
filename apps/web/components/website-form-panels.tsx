"use client";

import { useEffect, useState } from "react";

import { WebsiteFormPreview } from "@/components/website-widget-previews";
import { SettingsTechnicalDetails } from "@/components/settings/settings-technical-details";
import { useI18n } from "@/lib/i18n";

type WebsiteFormSettingsResponse = {
  enabled?: boolean;
  hasToken?: boolean;
  ingestToken?: string | null;
  organizationSlug?: string;
  endpointUrl?: string;
  embedSnippet?: string;
  error?: string;
};

export function WebsiteFormPanel({ compact = false }: { compact?: boolean } = {}) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<WebsiteFormSettingsResponse | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/organization/website-form");
        const payload = (await response.json()) as WebsiteFormSettingsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load website form settings.");
        }

        if (isMounted) {
          setSettings(payload);
          setEnabled(Boolean(payload.enabled));
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load website form settings.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveSettings(regenerateToken = false) {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organization/website-form", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          regenerateToken: regenerateToken || !settings?.hasToken,
        }),
      });
      const payload = (await response.json()) as WebsiteFormSettingsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save website form settings.");
      }

      setSettings(payload);
      setEnabled(Boolean(payload.enabled));
      setMessage(regenerateToken ? t("websiteForm.tokenRegenerated") : t("websiteForm.saved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save website form settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyEmbedSnippet() {
    if (!settings?.embedSnippet) {
      return;
    }

    await navigator.clipboard.writeText(settings.embedSnippet);
    setMessage(t("settings.hub.channels.feedback.codeCopied"));
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("common.loading")}…</p>;
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">{message}</p> : null}

      {compact ? (
        <>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
            {t("settings.hub.channels.websiteForm.enable")}
          </label>
          <p className="text-sm text-stone-600">{t("settings.hub.channels.websiteForm.copyHint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="soreya-btn-primary px-4 py-2 text-sm disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void saveSettings(false)}
              type="button"
            >
              {t("websiteForm.save")}
            </button>
            <button
              className="soreya-btn-secondary px-4 py-2 text-sm disabled:opacity-60"
              disabled={!settings?.embedSnippet}
              onClick={() => void copyEmbedSnippet()}
              type="button"
            >
              {t("settings.hub.channels.websiteForm.copyCode")}
            </button>
          </div>
          <p className="text-sm text-stone-500">{t("settings.hub.channels.websiteForm.copyDone")}</p>
          <SettingsTechnicalDetails>
            <p className="text-sm text-stone-600">{t("websiteForm.description")}</p>
            <div className="grid gap-2 text-sm text-stone-700">
              <p><span className="font-medium">{t("websiteForm.endpoint")}:</span> {settings?.endpointUrl}</p>
              <p><span className="font-medium">{t("websiteForm.slug")}:</span> {settings?.organizationSlug}</p>
            </div>
            {settings?.embedSnippet ? (
              <textarea
                className="min-h-32 w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-800"
                readOnly
                value={settings.embedSnippet}
              />
            ) : null}
            <button
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void saveSettings(true)}
              type="button"
            >
              {t("websiteForm.regenerateToken")}
            </button>
          </SettingsTechnicalDetails>
        </>
      ) : (
        <>
      <p className="text-sm text-stone-600">{t("websiteForm.description")}</p>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
        {t("websiteForm.enabled")}
      </label>

      <div className="grid gap-2 text-sm text-stone-700">
        <p><span className="font-medium">{t("websiteForm.endpoint")}:</span> {settings?.endpointUrl}</p>
        <p><span className="font-medium">{t("websiteForm.slug")}:</span> {settings?.organizationSlug}</p>
        {settings?.ingestToken ? (
          <p className="break-all"><span className="font-medium">{t("websiteForm.token")}:</span> {settings.ingestToken}</p>
        ) : (
          <p className="text-stone-500">{t("websiteForm.tokenMissing")}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void saveSettings(false)}
          type="button"
        >
          {t("websiteForm.save")}
        </button>
        <button
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void saveSettings(true)}
          type="button"
        >
          {t("websiteForm.regenerateToken")}
        </button>
      </div>

      {settings?.embedSnippet ? (
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          {t("websiteForm.embedSnippet")}
          <textarea
            className="min-h-48 rounded-md border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-800"
            readOnly
            value={settings.embedSnippet}
          />
        </label>
      ) : null}

      <section className="grid gap-3">
        <h3 className="text-sm font-medium text-stone-800">{t("websiteForm.preview.title")}</h3>
        <WebsiteFormPreview />
      </section>
        </>
      )}
    </div>
  );
}
