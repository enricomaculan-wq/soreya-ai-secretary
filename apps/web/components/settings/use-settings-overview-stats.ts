"use client";

import { useCallback, useEffect, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";

type OverviewStats = {
  requestCount: number;
  pendingApprovals: number;
};

export function useSettingsOverviewStats(enabled: boolean) {
  const { locale } = useI18n();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    if (shouldUseWebDemoData()) {
      const demo = getWebDemoData(locale);
      setStats({
        requestCount: demo.emailMessages.length + demo.whatsappMessages.length,
        pendingApprovals: demo.suggestedActions.filter(
          (action) => action.status === "pending_approval" || action.status === "edited",
        ).length,
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/organization/overview-stats");
      const payload = (await response.json()) as OverviewStats & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load overview stats.");
      }

      setStats({
        requestCount: payload.requestCount ?? 0,
        pendingApprovals: payload.pendingApprovals ?? 0,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load overview stats.");
      setStats({ requestCount: 0, pendingApprovals: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [enabled, locale]);

  useEffect(() => {
    void Promise.resolve().then(() => loadStats());
  }, [loadStats]);

  return { stats, isLoading, error, reload: loadStats };
}
