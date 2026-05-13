"use client";

import type { DailySummary, DailySummarySettings } from "@soreya/shared";
import { useCallback, useEffect, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type SummaryResponse = {
  summary?: DailySummary;
  error?: string;
};

type SettingsResponse = {
  settings?: DailySummarySettings;
  error?: string;
};

const DEFAULT_SETTINGS: DailySummarySettings = {
  organizationId: "",
  enabled: true,
  deliveryTime: "08:00",
  timezone: "Europe/Rome",
  includeCalendar: true,
  includePendingApprovals: true,
  includeUnhandledMessages: true,
  includeFreeSlots: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function DailySummaryPanel() {
  const { locale, t } = useI18n();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadSummary = useCallback(async () => {
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setSummary(getWebDemoData(locale).dailySummary);
      setMessage(t("demo.description"));
      setIsLoading(false);
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setMessage("Supabase is not configured. Daily Summary is unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      await syncCurrentSession();
      const response = await fetch("/api/daily-summary/today");
      const payload = (await response.json()) as SummaryResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load Daily Summary.");
      }

      setSummary(payload.summary ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load Daily Summary.");
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void Promise.resolve().then(loadSummary);
  }, [loadSummary]);

  async function generateSummary() {
    setIsGenerating(true);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setSummary({
        ...getWebDemoData(locale).dailySummary,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setMessage(t("dailySummary.generatedNoNotifications"));
      setIsGenerating(false);
      return;
    }

    try {
      await syncCurrentSession();
      const response = await fetch("/api/daily-summary/generate", { method: "POST" });
      const payload = (await response.json()) as SummaryResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate Daily Summary.");
      }

      setSummary(payload.summary ?? null);
      setMessage("Daily Summary generated from cached Soreya data. No notifications were sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate Daily Summary.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function markViewed() {
    if (!summary) {
      return;
    }

    try {
      if (shouldUseWebDemoData()) {
        setSummary({ ...summary, status: "viewed", viewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        setMessage(t("dailySummary.markViewed"));
        return;
      }

      await syncCurrentSession();
      const response = await fetch("/api/daily-summary/viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryId: summary.id }),
      });
      const payload = (await response.json()) as SummaryResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to mark Daily Summary as viewed.");
      }

      setSummary(payload.summary ?? summary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to mark Daily Summary as viewed.");
    }
  }

  if (isLoading) {
    return <EmptyState title={`${t("common.loading")} ${t("dailySummary.title")}`} detail={t("dashboard.emailWhatsappRequests")} />;
  }

  return (
    <div className="mt-5 space-y-5">
      <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        {t("safety.noAutomaticActions")}
      </p>

      {message ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
      ) : null}

      {summary ? (
        <>
          <div>
            <p className="text-sm font-medium text-stone-500">{summary.title}</p>
            <h3 className="mt-2 text-lg font-semibold tracking-normal text-stone-950">{summary.headline}</h3>
            <p className="mt-1 text-sm text-stone-500">
              {summary.summaryDate} · {summary.timezone} · {summary.status}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label={t("dailySummary.appointments")} value={summary.totalAppointments} detail={summary.firstAppointmentAt ? formatTime(summary.firstAppointmentAt) : "-"} />
            <Metric label={t("calendar.cachedEvents")} value={summary.lastAppointmentAt ? formatTime(summary.lastAppointmentAt) : "-"} detail={t("dailySummary.title")} />
            <Metric label={t("dailySummary.approvals")} value={summary.pendingApprovalsCount} detail={t("common.pendingApproval")} />
            <Metric label={t("dailySummary.conflicts")} value={summary.conflictsCount} detail={t("calendar.title")} />
            <Metric label={t("dailySummary.messages")} value={summary.unhandledMessagesCount} detail={t("navigation.inbox")} />
            <Metric label={t("dailySummary.freeSlots")} value={summary.freeSlotsCount} detail={t("calendar.alternativeSlots")} />
          </div>

          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {[...summary.items, ...summary.recommendations].slice(0, 12).map((item) => (
              <div key={item.id} className="py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-950">{item.title}</p>
                    <p className="mt-1 text-sm text-stone-500">{item.description ?? item.type}</p>
                    {item.startsAt ? <p className="mt-1 text-xs text-stone-500">{formatDateTime(item.startsAt)}</p> : null}
                  </div>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700">
                    {item.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          detail={t("empty.dailySummary.missing")}
          next={t("empty.dailySummary.next")}
          title={t("empty.dailySummary.title")}
          why={t("empty.dailySummary.why")}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={isGenerating}
          onClick={generateSummary}
          type="button"
        >
          {isGenerating ? `${t("common.loading")}...` : t("dailySummary.generateToday")}
        </button>
        <button
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:bg-stone-100"
          disabled={!summary}
          onClick={markViewed}
          type="button"
        >
          {t("dailySummary.markViewed")}
        </button>
        <a className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700" href="#approvals">
          {t("navigation.approvals")}
        </a>
        <a className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700" href="#calendar">
          {t("navigation.calendar")}
        </a>
        <a className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700" href="#emergency">
          {t("emergency.mode")}
        </a>
      </div>
    </div>
  );
}

export function DailySummarySettingsPanel() {
  const { locale, t } = useI18n();
  const [settings, setSettings] = useState<DailySummarySettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      if (shouldUseWebDemoData()) {
        setSettings(getWebDemoData(locale).dailySummarySettings);
        setMessage(t("demo.description"));
        return;
      }

      if (!hasSupabaseBrowserConfig()) {
        setMessage("Supabase is not configured. Daily Summary settings are unavailable.");
        return;
      }

      try {
        await syncCurrentSession();
        const response = await fetch("/api/daily-summary/settings");
        const payload = (await response.json()) as SettingsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load Daily Summary settings.");
        }

        if (payload.settings && isMounted) {
          setSettings(payload.settings);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load Daily Summary settings.");
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [locale, t]);

  async function saveSettings() {
    setIsSaving(true);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setSettings((current) => ({ ...current, updatedAt: new Date().toISOString() }));
      setMessage(t("settings.languageSaved"));
      setIsSaving(false);
      return;
    }

    try {
      await syncCurrentSession();
      const response = await fetch("/api/daily-summary/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as SettingsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save Daily Summary settings.");
      }

      setSettings(payload.settings ?? settings);
      setMessage("Daily Summary settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Daily Summary settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-stone-700">
          {t("dailySummary.deliveryTime")}
          <input
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950"
            onChange={(event) => setSettings((current) => ({ ...current, deliveryTime: event.target.value }))}
            type="time"
            value={settings.deliveryTime.slice(0, 5)}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          {t("dailySummary.timezone")}
          <input
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950"
            onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))}
            value={settings.timezone}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle label={t("common.ready")} checked={settings.enabled} onChange={(value) => setSettings((current) => ({ ...current, enabled: value }))} />
        <Toggle label={t("calendar.title")} checked={settings.includeCalendar} onChange={(value) => setSettings((current) => ({ ...current, includeCalendar: value }))} />
        <Toggle label={t("common.pendingApproval")} checked={settings.includePendingApprovals} onChange={(value) => setSettings((current) => ({ ...current, includePendingApprovals: value }))} />
        <Toggle label={t("dailySummary.messages")} checked={settings.includeUnhandledMessages} onChange={(value) => setSettings((current) => ({ ...current, includeUnhandledMessages: value }))} />
        <Toggle label={t("dailySummary.freeSlots")} checked={settings.includeFreeSlots} onChange={(value) => setSettings((current) => ({ ...current, includeFreeSlots: value }))} />
      </div>

      <button
        className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={isSaving}
        onClick={saveSettings}
        type="button"
      >
        {isSaving ? `${t("common.loading")}...` : t("common.save")}
      </button>

      {message ? <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}
    </div>
  );
}

async function syncCurrentSession() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  await syncSupabaseSessionToServer(data.session);
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
      {label}
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function Metric({ detail, label, value }: { detail: string; label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-normal text-stone-950">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}

function EmptyState({
  detail,
  next,
  title,
  why,
}: {
  detail: string;
  next?: string;
  title: string;
  why?: string;
}) {
  return (
    <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-5">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{detail}</p>
      {why ? <p className="mt-3 text-sm leading-6 text-stone-600">{why}</p> : null}
      {next ? <p className="mt-2 text-sm leading-6 text-stone-600">{next}</p> : null}
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
