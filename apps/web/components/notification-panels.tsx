"use client";

import { useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";

type TestNotificationResponse = {
  sent?: boolean;
  disabled?: boolean;
  reason?: string;
  results?: unknown[];
  error?: string;
};

export function NotificationSettingsPanel() {
  const { locale, t } = useI18n();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendTestNotification() {
    setIsSending(true);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      const status = getWebDemoData(locale).notificationStatus;
      setMessage(`${status.message} Demo has ${status.registeredDevices} notification-ready device(s).`);
      setIsSending(false);
      return;
    }

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as TestNotificationResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send a test notification.");
      }

      if (payload.disabled) {
        setMessage(payload.reason ?? "Push notifications are disabled by ENABLE_PUSH_NOTIFICATIONS.");
        return;
      }

      setMessage(`Test notification prepared for ${payload.results?.length ?? 0} registered device(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send a test notification.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-950">{t("notifications.expoPush")}</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {t("notifications.noExecution")}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          {t("safety.noAutomaticActions")}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-stone-600">
        {shouldUseWebDemoData() ? (
          <p>
            {getWebDemoData(locale).notificationStatus.message}
          </p>
        ) : null}
        <p>
          Set <span className="font-mono text-stone-950">ENABLE_PUSH_NOTIFICATIONS=true</span> and configure{" "}
          <span className="font-mono text-stone-950">EXPO_ACCESS_TOKEN</span> to send real Expo push notifications.
        </p>
        <p>Mobile devices register tokens from the Soreya mobile Settings screen.</p>
      </div>

      <button
        type="button"
        onClick={sendTestNotification}
        disabled={isSending}
        className="mt-4 rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {isSending ? `${t("common.loading")}...` : t("notifications.sendTest")}
      </button>

      {message ? <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p> : null}
    </div>
  );
}
