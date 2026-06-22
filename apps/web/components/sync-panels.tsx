"use client";

import type { SyncLog } from "@soreya/shared";
import { useCallback, useEffect, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type SyncStatusResponse = {
  syncLogs?: SyncLog[];
  error?: string;
  message?: string;
};

type SyncRunResponse = {
  disabled?: boolean;
  message?: string;
  tokenRefresh?: unknown[];
  results?: unknown[];
  error?: string;
};

export function SyncSchedulerPanel() {
  const { locale, t, label } = useI18n();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const loadStatus = useCallback(async () => {
    if (shouldUseWebDemoData()) {
      setLogs(getWebDemoData(locale).syncLogs);
      setMessage(t("demo.description"));
      setIsLoading(false);
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setMessage("Supabase is not configured. Sync status is unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(data.session);
      const response = await fetch("/api/sync/status");
      const payload = (await response.json()) as SyncStatusResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load sync status.");
      }

      setLogs(payload.syncLogs ?? []);
      setMessage(payload.message ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load sync status.");
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void Promise.resolve().then(loadStatus);
  }, [loadStatus]);

  async function runSyncNow(refreshOnly = false) {
    setIsRunning(true);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setMessage(
        refreshOnly
          ? t("sync.demoRefreshChecked")
          : t("sync.demoRunCompleted"),
      );
      setLogs(getWebDemoData(locale).syncLogs);
      setIsRunning(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(data.session);
      const response = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refreshOnly ? { providers: [], jobType: "full_sync" } : { jobType: "full_sync" }),
      });
      const payload = (await response.json()) as SyncRunResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Sync failed.");
      }

      setMessage(
        refreshOnly
          ? `Token refresh checked ${payload.tokenRefresh?.length ?? 0} account(s).`
          : payload.message ?? "Sync completed.",
      );
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="soreya-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-normal text-stone-950">{t("sync.scheduler")}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            {t("sync.readOnly")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100"
            disabled={isRunning}
            onClick={() => runSyncNow(true)}
            type="button"
          >
            {t("sync.refreshTokens")}
          </button>
          <button
            className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={isRunning}
            onClick={() => runSyncNow(false)}
            type="button"
          >
            {isRunning ? `${t("common.loading")}...` : t("sync.runNow")}
          </button>
        </div>
      </div>

      {message ? <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-stone-500">
            <tr>
              <th className="border-b border-stone-200 py-2 pr-4">Provider</th>
              <th className="border-b border-stone-200 py-2 pr-4">{t("sync.job")}</th>
              <th className="border-b border-stone-200 py-2 pr-4">{t("common.status")}</th>
              <th className="border-b border-stone-200 py-2 pr-4">{t("sync.records")}</th>
              <th className="border-b border-stone-200 py-2 pr-4">{t("sync.finished")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="border-b border-stone-100 py-3 pr-4 text-stone-700">{label("providers", log.provider)}</td>
                  <td className="border-b border-stone-100 py-3 pr-4 text-stone-700">{log.jobType}</td>
                  <td className="border-b border-stone-100 py-3 pr-4 text-stone-700">{label("syncStatus", log.status)}</td>
                  <td className="border-b border-stone-100 py-3 pr-4 text-stone-700">{log.recordsRead}</td>
                  <td className="border-b border-stone-100 py-3 pr-4 text-stone-700">
                    {log.finishedAt ? formatDateTime(log.finishedAt, locale) : t("sync.running")}
                    {log.errorMessage ? <span className="block text-rose-700">{log.errorMessage}</span> : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 text-sm text-stone-500" colSpan={5}>
                  {isLoading ? `${t("common.loading")}...` : t("sync.noLogs")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDateTime(value: string, locale: "it" | "en") {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
