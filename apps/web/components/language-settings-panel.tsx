"use client";

import { useI18n } from "@/lib/i18n";
import type { SupportedLocale } from "@soreya/shared";

export function LanguageSettingsPanel() {
  const { locale, setLocale, t } = useI18n();
  const changeLocale = (nextLocale: SupportedLocale) => {
    setLocale(nextLocale);
    window.setTimeout(() => window.location.reload(), 0);
  };

  return (
    <>
      <h2 className="mb-3 text-xl font-semibold tracking-normal">{t("settings.language")}</h2>
      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-md border px-4 py-2 text-sm font-medium ${locale === "it" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white text-stone-700"}`}
          onClick={() => changeLocale("it")}
          type="button"
        >
          {t("settings.italian")}
        </button>
        <button
          className={`rounded-md border px-4 py-2 text-sm font-medium ${locale === "en" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white text-stone-700"}`}
          onClick={() => changeLocale("en")}
          type="button"
        >
          {t("settings.english")}
        </button>
      </div>
    </>
  );
}
