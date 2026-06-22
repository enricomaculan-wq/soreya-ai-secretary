"use client";

import type { SettingsChannelId } from "@soreya/shared";
import Link from "next/link";

import { useI18n } from "@/lib/i18n";

import { ChannelStatusBadge } from "./settings-channels-shared";
import type { useSettingsChannels } from "./settings-channels-shared";
import { useSettingsOverviewStats } from "./use-settings-overview-stats";

export function SettingsOverviewTab({
  channels,
  onOpenChannels,
  onManageChannel,
}: {
  channels: ReturnType<typeof useSettingsChannels>;
  onOpenChannels: (openMenu?: boolean) => void;
  onManageChannel: (channelId: SettingsChannelId) => void;
}) {
  const { t } = useI18n();
  const { addedChannels, statuses, isLoading } = channels;
  const hasChannels = addedChannels.length > 0;
  const { stats, isLoading: statsLoading } = useSettingsOverviewStats(hasChannels && !isLoading);

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("common.loading")}…</p>;
  }

  if (!hasChannels) {
    return (
      <section className="soreya-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-stone-950">{t("settings.hub.overview.welcomeTitle")}</h2>
        <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-stone-600">
          {t("settings.hub.overview.welcomeBody")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="soreya-btn-primary px-4 py-2 text-sm" onClick={() => onOpenChannels(true)} type="button">
            {t("settings.hub.overview.addFirstChannel")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="soreya-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-stone-950">
              {t("settings.hub.overview.yourChannelsTitle")}
            </h2>
            <p className="mt-1 text-sm text-stone-600">{t("settings.hub.overview.yourChannelsSubtitle")}</p>
          </div>
          <button
            className="soreya-btn-primary px-4 py-2 text-sm"
            onClick={() => onOpenChannels(true)}
            type="button"
          >
            {t("settings.hub.channels.addChannel")}
          </button>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {addedChannels.map((channelId) => {
            const status = statuses?.[channelId] ?? "setup";

            return (
              <li className="rounded-xl border border-stone-200 bg-white p-4" key={channelId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-950">{t(`settings.hub.channels.rowTitle.${channelId}`)}</p>
                    <div className="mt-2">
                      <ChannelStatusBadge status={status} />
                    </div>
                  </div>
                  <button
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700"
                    onClick={() => onManageChannel(channelId)}
                    type="button"
                  >
                    {t("settings.hub.overview.manage")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="soreya-card-muted p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-stone-950">{t("settings.hub.overview.todayTitle")}</h3>
            {statsLoading ? (
              <p className="mt-2 text-sm text-stone-500">{t("common.loading")}…</p>
            ) : stats && (stats.requestCount > 0 || stats.pendingApprovals > 0) ? (
              <p className="mt-2 text-sm text-stone-600">
                {t("settings.hub.overview.todayStats", {
                  count: stats.requestCount,
                  pending: stats.pendingApprovals,
                })}
              </p>
            ) : (
              <p className="mt-2 text-sm text-stone-600">{t("settings.hub.overview.todayEmpty")}</p>
            )}
          </div>
          <Link className="soreya-btn-secondary px-3 py-2 text-sm" href="/dashboard">
            {t("navigation.dashboard")}
          </Link>
        </div>
      </section>

      <p className="text-sm leading-relaxed text-stone-600">{t("settings.hub.reassurance")}</p>
    </div>
  );
}
