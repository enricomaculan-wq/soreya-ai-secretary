"use client";

import { BrainSettingsPanel } from "@/components/brain-panels";
import { useI18n } from "@/lib/i18n";

export function SettingsStudioTab() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <section className="soreya-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-stone-950">{t("settings.hub.studio.catalogTitle")}</h2>
        <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-stone-600">
          {t("settings.hub.studio.catalogEmpty")}
        </p>
        <div className="mt-6">
          <BrainSettingsPanel />
        </div>
      </section>
    </div>
  );
}
