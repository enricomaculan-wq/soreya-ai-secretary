"use client";

import { useEffect, useState } from "react";

import { WebsiteChatWidgetPreview } from "@/components/website-widget-previews";
import { SettingsTechnicalDetails } from "@/components/settings/settings-technical-details";
import { useI18n } from "@/lib/i18n";

type WebsiteChatSettingsResponse = {
  enabled?: boolean;
  hasFormToken?: boolean;
  ingestReady?: boolean;
  organizationSlug?: string;
  sessionEndpointUrl?: string;
  messageEndpointUrl?: string;
  pollEndpointUrl?: string;
  embedSnippet?: string;
  error?: string;
};

export function WebsiteChatPanel({ compact = false }: { compact?: boolean } = {}) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<WebsiteChatSettingsResponse | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/organization/website-chat");
        const payload = (await response.json()) as WebsiteChatSettingsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load website chat settings.");
        }

        if (isMounted) {
          setSettings(payload);
          setEnabled(Boolean(payload.enabled));
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load website chat settings.");
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

  async function saveSettings() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organization/website-chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const payload = (await response.json()) as WebsiteChatSettingsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save website chat settings.");
      }

      setSettings(payload);
      setEnabled(Boolean(payload.enabled));
      setMessage(t("websiteChat.saved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save website chat settings.");
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
          {!settings?.hasFormToken ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("websiteChat.formTokenRequired")}
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
            {t("settings.hub.channels.websiteChat.enable")}
          </label>
          <p className="text-sm text-stone-600">{t("settings.hub.channels.websiteChat.copyHint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="soreya-btn-primary px-4 py-2 text-sm disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void saveSettings()}
              type="button"
            >
              {t("websiteChat.save")}
            </button>
            <button
              className="soreya-btn-secondary px-4 py-2 text-sm disabled:opacity-60"
              disabled={!settings?.embedSnippet}
              onClick={() => void copyEmbedSnippet()}
              type="button"
            >
              {t("settings.hub.channels.websiteChat.copyCode")}
            </button>
          </div>
          <p className="text-sm text-stone-500">{t("settings.hub.channels.websiteChat.copyDone")}</p>
          <SettingsTechnicalDetails>
            <p className="text-sm text-stone-600">{t("websiteChat.description")}</p>
            <div className="grid gap-2 text-sm text-stone-700">
              <p><span className="font-medium">{t("websiteChat.sessionEndpoint")}:</span> {settings?.sessionEndpointUrl}</p>
              <p><span className="font-medium">{t("websiteChat.slug")}:</span> {settings?.organizationSlug}</p>
            </div>
            {settings?.embedSnippet ? (
              <textarea
                className="min-h-32 w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-800"
                readOnly
                value={settings.embedSnippet}
              />
            ) : null}
          </SettingsTechnicalDetails>
        </>
      ) : (
        <>
      <p className="text-sm text-stone-600">{t("websiteChat.description")}</p>

      {!settings?.hasFormToken ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("websiteChat.formTokenRequired")}
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input checked={enabled} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
        {t("websiteChat.enabled")}
      </label>

      <div className="grid gap-2 text-sm text-stone-700">
        <p><span className="font-medium">{t("websiteChat.sessionEndpoint")}:</span> {settings?.sessionEndpointUrl}</p>
        <p><span className="font-medium">{t("websiteChat.messageEndpoint")}:</span> {settings?.messageEndpointUrl}</p>
        <p><span className="font-medium">{t("websiteChat.pollEndpoint")}:</span> {settings?.pollEndpointUrl}</p>
        <p><span className="font-medium">{t("websiteChat.slug")}:</span> {settings?.organizationSlug}</p>
        <p>
          <span className="font-medium">{t("websiteChat.ingestReady")}:</span>{" "}
          {settings?.ingestReady ? t("websiteChat.readyYes") : t("websiteChat.readyNo")}
        </p>
      </div>

      <button
        className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={isSaving}
        onClick={() => void saveSettings()}
        type="button"
      >
        {t("websiteChat.save")}
      </button>

      {settings?.embedSnippet ? (
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          {t("websiteChat.embedSnippet")}
          <textarea
            className="min-h-48 rounded-md border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-800"
            readOnly
            value={settings.embedSnippet}
          />
        </label>
      ) : null}

      <section className="grid gap-3">
        <h3 className="text-sm font-medium text-stone-800">{t("websiteChat.preview.title")}</h3>
        <WebsiteChatWidgetPreview />
      </section>
        </>
      )}
    </div>
  );
}
