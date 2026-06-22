"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

export function SettingsTechnicalDetails({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <button
        className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {t("settings.hub.channels.technicalDetails")}
      </button>
      {isOpen ? (
        <div className="mt-3 space-y-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700">
          <p className="text-xs text-stone-500">{t("settings.hub.channels.technicalIntro")}</p>
          {children}
        </div>
      ) : null}
    </div>
  );
}
