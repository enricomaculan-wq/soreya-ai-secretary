"use client";

import type { NotificationPreferences, RegisteredDevice } from "@soreya/shared";
import { useEffect, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";

type PreferencesForm = Pick<
  NotificationPreferences,
  | "watchFriendlyNotificationsEnabled"
  | "allowQuickApproveFromWatch"
  | "allowQuickIgnoreFromWatch"
  | "showDailySummaryOnWatch"
  | "emergencyShortcutsOnWatch"
>;

type DevicesResponse = {
  devices?: RegisteredDevice[];
  smartwatchCapableDevices?: RegisteredDevice[];
  preferences?: NotificationPreferences | null;
  safetyCopy?: string;
  error?: string;
};

const DEFAULT_PREFERENCES: PreferencesForm = {
  watchFriendlyNotificationsEnabled: true,
  allowQuickApproveFromWatch: false,
  allowQuickIgnoreFromWatch: false,
  showDailySummaryOnWatch: true,
  emergencyShortcutsOnWatch: false,
};

const preferenceRows: Array<{
  key: keyof PreferencesForm;
  label: string;
  detailKey: string;
}> = [
  {
    key: "watchFriendlyNotificationsEnabled",
    label: "Watch-friendly notifications",
    detailKey: "multiDevice.watchFriendlyDetail",
  },
  {
    key: "allowQuickApproveFromWatch",
    label: "Quick approve from watch",
    detailKey: "multiDevice.quickApproveDetail",
  },
  {
    key: "allowQuickIgnoreFromWatch",
    label: "Quick ignore from watch",
    detailKey: "multiDevice.quickIgnoreDetail",
  },
  {
    key: "showDailySummaryOnWatch",
    label: "Daily Summary on watch",
    detailKey: "multiDevice.dailySummaryDetail",
  },
  {
    key: "emergencyShortcutsOnWatch",
    label: "Emergency shortcuts on watch",
    detailKey: "multiDevice.emergencyShortcutsDetail",
  },
];

export function MultiDevicePanel() {
  const { locale, t, label } = useI18n();
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [smartwatchCapableDevices, setSmartwatchCapableDevices] = useState<RegisteredDevice[]>([]);
  const [preferences, setPreferences] = useState<PreferencesForm>(DEFAULT_PREFERENCES);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof PreferencesForm | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      if (shouldUseWebDemoData()) {
        const demo = getWebDemoData(locale);
        if (isMounted) {
          setDevices(demo.registeredDevices);
          setSmartwatchCapableDevices(demo.registeredDevices.filter((device) => device.deviceType === "smartwatch"));
          setPreferences(valuesFromPreferences(demo.notificationPreferences));
          setMessage(t("demo.description"));
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/notifications/devices");
        const payload = (await response.json()) as DevicesResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load multi-device settings.");
        }

        if (isMounted) {
          setDevices(payload.devices ?? []);
          setSmartwatchCapableDevices(payload.smartwatchCapableDevices ?? []);
          setPreferences(valuesFromPreferences(payload.preferences));
          setMessage(payload.safetyCopy ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load multi-device settings.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDevices();

    return () => {
      isMounted = false;
    };
  }, [locale, t]);

  async function updatePreference(key: keyof PreferencesForm, value: boolean) {
    const nextPreferences = { ...preferences, [key]: value };
    setPreferences(nextPreferences);
    setSavingKey(key);

    if (shouldUseWebDemoData()) {
      setMessage(t("safety.smartwatchApprovalIsNotExecution"));
      setSavingKey(null);
      return;
    }

    try {
      const response = await fetch("/api/notifications/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPreferences),
      });
      const payload = (await response.json()) as DevicesResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save smartwatch preferences.");
      }

      setPreferences(valuesFromPreferences(payload.preferences));
      setMessage("Smartwatch preferences saved. Smartwatch approval is not execution. Soreya still requires final confirmation before sending messages or modifying calendars.");
    } catch (error) {
      setPreferences(preferences);
      setMessage(error instanceof Error ? error.message : "Unable to save smartwatch preferences.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="soreya-card-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-950">{t("multiDevice.title")}</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {t("multiDevice.watchBridge")}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-[var(--trust-border)] bg-[var(--trust-soft)] px-2.5 py-1 text-xs font-medium text-emerald-700">
          {t("multiDevice.smartwatchReady")}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label={t("multiDevice.registeredDevices")} value={String(devices.length)} />
        <Metric label={t("multiDevice.mobile")} value={String(devices.filter((device) => device.deviceType === "mobile").length)} />
        <Metric label={t("multiDevice.smartwatch")} value={String(smartwatchCapableDevices.length)} />
      </div>

      <div className="mt-4 overflow-hidden soreya-card">
        {isLoading ? (
          <p className="p-4 text-sm text-stone-600">{t("common.loading")}...</p>
        ) : devices.length === 0 ? (
          <div className="p-4 text-sm leading-6 text-stone-600">
            <p className="font-medium text-stone-950">{t("empty.devices.title")}</p>
            <p className="mt-1">{t("empty.devices.missing")}</p>
            <p className="mt-2">{t("empty.devices.why")}</p>
            <p className="mt-2">{t("empty.devices.next")}</p>
          </div>
        ) : (
          devices.map((device) => (
            <div key={device.id} className="grid gap-2 border-t border-stone-100 p-4 first:border-t-0 sm:grid-cols-[1.1fr_0.8fr_1.4fr]">
              <div>
                <p className="text-sm font-medium text-stone-950">{device.deviceName ?? "Unnamed device"}</p>
                <p className="mt-1 text-xs text-stone-500">
                {device.deviceType} / {device.platform}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">{t("common.status")}</p>
                <span className={statusClassName(device.status)}>{label("syncStatus", device.status) || device.status}</span>
                <p className="mt-2 text-xs text-stone-500">{t("multiDevice.lastSeen")} {formatDateTime(device.lastSeenAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">{t("multiDevice.capabilities")}</p>
                <p className="mt-1 text-sm leading-6 text-stone-700">{formatCapabilities(device.capabilities, t)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-3">
        {preferenceRows.map((row) => (
          <label key={row.key} className="flex items-start justify-between gap-4 soreya-card p-3">
              <span>
                <span className="block text-sm font-medium text-stone-950">{watchPreferenceLabel(row.key, t)}</span>
              <span className="mt-1 block text-xs leading-5 text-stone-600">{t(row.detailKey)}</span>
            </span>
            <input
              type="checkbox"
              checked={preferences[row.key]}
              disabled={savingKey === row.key}
              onChange={(event) => updatePreference(row.key, event.target.checked)}
              className="mt-1 h-4 w-4 accent-stone-950"
            />
          </label>
        ))}
      </div>

      {message ? <p className="mt-4 text-sm leading-6 text-stone-600">{message}</p> : null}
    </div>
  );
}

function watchPreferenceLabel(key: keyof PreferencesForm, translate: (key: string) => string): string {
  const labels: Record<keyof PreferencesForm, string> = {
    watchFriendlyNotificationsEnabled: translate("multiDevice.enableWatchFriendly"),
    allowQuickApproveFromWatch: translate("multiDevice.allowQuickApprove"),
    allowQuickIgnoreFromWatch: translate("multiDevice.allowQuickIgnore"),
    showDailySummaryOnWatch: translate("multiDevice.showDailySummary"),
    emergencyShortcutsOnWatch: translate("multiDevice.emergencyShortcuts"),
  };

  return labels[key];
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="soreya-card p-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">{value}</p>
    </div>
  );
}

function valuesFromPreferences(preferences: NotificationPreferences | null | undefined): PreferencesForm {
  if (!preferences) {
    return DEFAULT_PREFERENCES;
  }

  return {
    watchFriendlyNotificationsEnabled: preferences.watchFriendlyNotificationsEnabled,
    allowQuickApproveFromWatch: preferences.allowQuickApproveFromWatch,
    allowQuickIgnoreFromWatch: preferences.allowQuickIgnoreFromWatch,
    showDailySummaryOnWatch: preferences.showDailySummaryOnWatch,
    emergencyShortcutsOnWatch: preferences.emergencyShortcutsOnWatch,
  };
}

function statusClassName(status: RegisteredDevice["status"]): string {
  if (status === "active") {
    return "mt-1 inline-flex rounded-full border border-[var(--trust-border)] bg-[var(--trust-soft)] px-2 py-0.5 text-xs font-medium text-emerald-700";
  }

  if (status === "revoked") {
    return "mt-1 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700";
  }

  return "mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700";
}

function formatCapabilities(capabilities: RegisteredDevice["capabilities"], translate: (key: string) => string): string {
  if (capabilities.length === 0) {
    return translate("multiDevice.noCapabilities");
  }

  return capabilities.map((capability) => capability.replace(/_/g, " ")).join(", ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
