"use client";

import type { SettingsChannelId } from "@soreya/shared";
import { useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { AppPageBody, AppPageHeader, AppPageShell } from "@/components/ui/app-shell";
import { useI18n } from "@/lib/i18n";
import { shouldUseWebDemoData } from "@/lib/demo-data";
import Link from "next/link";

import { useSettingsChannels } from "./settings-channels-shared";
import { SettingsChannelsTab } from "./settings-channels-tab";
import { SettingsOverviewTab } from "./settings-overview-tab";
import { SettingsPreferencesTab } from "./settings-preferences-tab";
import { SettingsStudioTab } from "./settings-studio-tab";

type SettingsTabId = "overview" | "channels" | "studio" | "preferences";

const TABS: SettingsTabId[] = ["overview", "channels", "studio", "preferences"];

export function SettingsWorkspace() {
  const { t } = useI18n();
  const channels = useSettingsChannels();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("overview");
  const [configChannelId, setConfigChannelId] = useState<SettingsChannelId | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const demoMode = shouldUseWebDemoData();

  function openChannelsTab(channelId?: SettingsChannelId, openMenu = false) {
    setActiveTab("channels");
    setAddMenuOpen(openMenu);
    if (channelId) {
      setConfigChannelId(channelId);
    }
  }

  return (
    <AppPageShell>
      <SiteHeader active="settings" />

      <AppPageHeader
        actions={
          demoMode ? (
            <>
              <Link className="soreya-btn-secondary px-3 py-2 text-sm" href="/app">
                {t("settings.backToDemo")}
              </Link>
              <Link className="soreya-btn-primary px-3 py-2 text-sm" href="/dashboard">
                {t("settings.openDashboard")}
              </Link>
            </>
          ) : (
            <Link className="soreya-btn-primary px-3 py-2 text-sm" href="/dashboard">
              {t("navigation.dashboard")}
            </Link>
          )
        }
        description={t("settings.hub.pageSubtitle")}
        eyebrow={t("navigation.settings")}
        title={t("settings.hub.pageTitle")}
      />

      <AppPageBody>
        <div className="mb-6 flex flex-wrap gap-2 border-b border-stone-200 pb-1">
          {TABS.map((tabId) => (
            <button
              className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tabId
                  ? "border-stone-950 text-stone-950"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              type="button"
            >
              {t(`settings.hub.tabs.${tabId}`)}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <SettingsOverviewTab
            channels={channels}
            onManageChannel={(channelId) => openChannelsTab(channelId)}
            onOpenChannels={(openMenu) => openChannelsTab(undefined, openMenu ?? true)}
          />
        ) : null}

        {activeTab === "channels" ? (
          <SettingsChannelsTab
            addMenuOpen={addMenuOpen}
            channels={channels}
            configChannelId={configChannelId}
            onAddMenuOpenChange={setAddMenuOpen}
            onConfigChannel={setConfigChannelId}
          />
        ) : null}

        {activeTab === "studio" ? <SettingsStudioTab /> : null}
        {activeTab === "preferences" ? <SettingsPreferencesTab /> : null}
      </AppPageBody>
    </AppPageShell>
  );
}
