"use client";

import { useState } from "react";

import { DailySummarySettingsPanel } from "@/components/daily-summary-panel";
import { LanguageSettingsPanel } from "@/components/language-settings-panel";
import { NotificationSettingsPanel } from "@/components/notification-panels";
import { useI18n } from "@/lib/i18n";

export function SettingsPreferencesTab() {
  const { t } = useI18n();
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <div className="space-y-6">
      <section className="soreya-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-stone-950">{t("settings.hub.preferences.title")}</h2>
        <p className="mt-1 text-sm text-stone-600">{t("settings.hub.preferences.subtitle")}</p>

        <div className="mt-6 space-y-8">
          <div>
            <h3 className="text-sm font-medium text-stone-950">{t("settings.hub.preferences.languageLabel")}</h3>
            <div className="mt-3">
              <LanguageSettingsPanel />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-stone-950">{t("settings.hub.preferences.notificationsTitle")}</h3>
            <p className="mt-1 text-sm text-stone-600">{t("settings.hub.preferences.notificationsHint")}</p>
            <div className="mt-3">
              <NotificationSettingsPanel />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-stone-950">{t("settings.hub.preferences.dailySummaryTitle")}</h3>
            <p className="mt-1 text-sm text-stone-600">{t("settings.hub.preferences.dailySummaryHint")}</p>
            <div className="mt-3">
              <DailySummarySettingsPanel />
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <h3 className="text-sm font-medium text-stone-950">{t("settings.hub.preferences.mobileTitle")}</h3>
            <p className="mt-2 text-sm text-stone-600">{t("settings.hub.preferences.mobileBody")}</p>
            <a className="soreya-btn-secondary mt-4 inline-flex px-4 py-2 text-sm" href="https://soreya.ai">
              {t("settings.hub.preferences.mobileCta")}
            </a>
          </div>
        </div>
      </section>

      <div className="text-center">
        <button
          className="text-xs text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline"
          onClick={() => setShowTechnical((current) => !current)}
          type="button"
        >
          {t("settings.hub.channels.integrationsLink")}
        </button>
        {showTechnical ? (
          <p className="mt-2 text-xs text-stone-500">{t("settings.hub.channels.technicalIntro")}</p>
        ) : null}
      </div>
    </div>
  );
}
