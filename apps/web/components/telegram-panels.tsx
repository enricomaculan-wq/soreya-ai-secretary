"use client";

import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";
import { shouldUseWebDemoData } from "@/lib/demo-data";
import { useAbsoluteAppUrl } from "@/lib/use-client-runtime";
import { SettingsTechnicalDetails } from "@/components/settings/settings-technical-details";

type TelegramStatusResponse = {
  connected?: boolean;
  botUserId?: string | null;
  botUsername?: string | null;
  displayName?: string | null;
  enabled?: boolean;
  status?: string;
  lastSyncedAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncError?: string | null;
  webhookSecret?: string | null;
  error?: string;
};

type TelegramConfigForm = {
  botToken: string;
  displayName: string;
  webhookSecret: string;
  enabled: boolean;
};

const INITIAL_FORM: TelegramConfigForm = {
  botToken: "",
  displayName: "",
  webhookSecret: "",
  enabled: true,
};

export function TelegramBotPanel({ compact = false }: { compact?: boolean } = {}) {
  const { t, label } = useI18n();
  const [status, setStatus] = useState<TelegramStatusResponse | null>(null);
  const [form, setForm] = useState<TelegramConfigForm>(INITIAL_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const webhookUrl = useAbsoluteAppUrl("/api/telegram/webhook");

  const loadStatus = useCallback(async () => {
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setStatus({
        connected: false,
        botUsername: "soreya_demo_bot",
        enabled: false,
        status: "not_connected",
      });
      setMessage(t("demo.description"));
      setIsLoading(false);
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setStatus(null);
      setMessage("Supabase is not configured. Telegram status is unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      await syncCurrentSession(supabase);
      const response = await fetch("/api/telegram/status");
      const payload = (await response.json()) as TelegramStatusResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load Telegram status.");
      }

      setStatus(payload);
      setForm((current) => ({
        ...current,
        displayName: current.displayName || payload.displayName || "",
        webhookSecret: current.webhookSecret || payload.webhookSecret || "",
        enabled: payload.enabled ?? current.enabled,
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load Telegram status.");
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void Promise.resolve().then(loadStatus);
  }, [loadStatus]);

  async function saveConfiguration() {
    setIsSaving(true);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setMessage(t("demo.description"));
      setForm((current) => ({ ...current, botToken: "" }));
      setIsSaving(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      await syncCurrentSession(supabase);
      const response = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as TelegramStatusResponse & { webhookSecret?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save Telegram configuration.");
      }

      setMessage(t("telegram.configurationSaved"));
      setForm((current) => ({
        ...current,
        botToken: "",
        webhookSecret: payload.webhookSecret ?? current.webhookSecret,
      }));
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Telegram configuration.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {compact ? (
        <>
          <p className="text-sm text-stone-600">
            {status?.connected
              ? t("settings.hub.channels.telegram.connected")
              : t("settings.hub.channels.telegram.disconnected")}
          </p>
          <SettingsTechnicalDetails>
            <div className="space-y-1 text-sm text-stone-600">
              <p>{t("telegram.botUsername")}: {status?.botUsername ? `@${status.botUsername}` : "-"}</p>
              <p>{t("telegram.botUserId")}: {status?.botUserId ?? "-"}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
              <p className="font-medium text-stone-950">{t("telegram.webhookUrl")}</p>
              <p className="mt-2 break-all font-mono text-xs">{webhookUrl}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label={t("telegram.botToken")} onChange={(value) => setFormValue("botToken", value, setForm)} type="password" value={form.botToken} />
              <TextInput label={t("telegram.displayName")} onChange={(value) => setFormValue("displayName", value, setForm)} value={form.displayName} />
              <TextInput label={t("telegram.webhookSecret")} onChange={(value) => setFormValue("webhookSecret", value, setForm)} value={form.webhookSecret} />
            </div>
          </SettingsTechnicalDetails>
          <button
            className="soreya-btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={saveConfiguration}
            type="button"
          >
            {isSaving ? `${t("common.loading")}...` : t("settings.hub.channels.telegram.connect")}
          </button>
        </>
      ) : (
        <>
      <div className="soreya-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-normal text-stone-950">{t("telegram.botApi")}</h3>
            <p className="mt-1 text-sm leading-6 text-stone-500">{t("safety.approvalFirst")}</p>
            <div className="mt-3 space-y-1 text-sm text-stone-600">
              <p>{t("common.status")}: {isLoading ? t("common.loading") : status?.status ?? t("common.notConnected")}</p>
              <p>{t("telegram.botUsername")}: {status?.botUsername ? `@${status.botUsername}` : "-"}</p>
              <p>{t("telegram.botUserId")}: {status?.botUserId ?? "-"}</p>
              <p>{t("telegram.enabled")}: {status?.enabled ? t("common.yes") : t("common.no")}</p>
              <p>{t("sync.title")}: {status?.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "-"}</p>
              <p>{t("common.status")}: {label("syncStatus", status?.lastSyncStatus ?? "none")}</p>
              {status?.lastSyncError ? <p className="text-rose-700">{t("sync.lastError")}: {status.lastSyncError}</p> : null}
            </div>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 lg:w-80">
            <p className="font-medium text-stone-950">{t("telegram.webhookUrl")}</p>
            <p className="mt-2 break-all font-mono text-xs">{webhookUrl}</p>
            <p className="mt-3 text-xs text-stone-500">{t("telegram.webhookSecretHint")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextInput
          label={t("telegram.botToken")}
          onChange={(value) => setFormValue("botToken", value, setForm)}
          type="password"
          value={form.botToken}
        />
        <TextInput
          label={t("telegram.displayName")}
          onChange={(value) => setFormValue("displayName", value, setForm)}
          value={form.displayName}
        />
        <TextInput
          label={t("telegram.webhookSecret")}
          onChange={(value) => setFormValue("webhookSecret", value, setForm)}
          value={form.webhookSecret}
        />
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 md:mt-7">
          <input
            checked={form.enabled}
            className="rounded border-stone-300"
            onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            type="checkbox"
          />
          {t("telegram.enabled")}
        </label>
      </div>

      <button
        className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={isSaving}
        onClick={saveConfiguration}
        type="button"
      >
        {isSaving ? `${t("common.loading")}...` : t("telegram.saveConfiguration")}
      </button>

      {message ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
      ) : null}
        </>
      )}
    </div>
  );
}

async function syncCurrentSession(supabase: ReturnType<typeof getSupabaseBrowserClient>) {
  const { data } = await supabase.auth.getSession();
  await syncSupabaseSessionToServer(data.session);
}

function TextInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "password" | "text";
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      <input
        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none focus:border-stone-500"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function setFormValue(
  key: keyof TelegramConfigForm,
  value: string | boolean,
  setForm: (updater: (current: TelegramConfigForm) => TelegramConfigForm) => void,
) {
  setForm((current) => ({ ...current, [key]: value }));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
