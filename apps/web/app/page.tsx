"use client";

import type { SupportedLocale } from "@soreya/shared";
import Link from "next/link";

import { useI18n } from "@/lib/i18n";

const keyPoints = [
  "landing.keyPoints.emailWhatsapp",
  "landing.keyPoints.calendarConflicts",
  "landing.keyPoints.approvalDrafts",
];

export default function LandingPage() {
  const { locale, setLocale, t } = useI18n();

  function changeLocale(nextLocale: SupportedLocale) {
    setLocale(nextLocale);
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-stone-950">
      <header className="border-b border-stone-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="text-lg font-semibold tracking-normal text-stone-950" href="/">
            {t("common.appName")}
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-lg border border-stone-200 bg-stone-50 p-1 sm:flex">
              {(["it", "en"] as const).map((language) => (
                <button
                  className={`h-9 rounded-md px-3 text-sm font-medium ${
                    locale === language ? "bg-stone-950 text-white" : "text-stone-600 hover:bg-white"
                  }`}
                  key={language}
                  onClick={() => changeLocale(language)}
                  type="button"
                >
                  {language.toUpperCase()}
                </button>
              ))}
            </div>
            <Link
              className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
              href="/app"
            >
              {t("landing.cta.primary")}
            </Link>
          </div>
        </div>
      </header>

      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {t("landing.badges.demo")}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal text-stone-950 sm:text-5xl lg:text-6xl">
              {t("landing.hero.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                className="rounded-md bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
                href="/app"
              >
                {t("landing.cta.primary")}
              </Link>
              <span className="text-sm font-medium text-emerald-800">{t("landing.safety.shortCopy")}</span>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-stone-950">{t("demoPlayground.examplesLabel")}</p>
            <div className="mt-4 space-y-3">
              <p className="rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                {t("demoPlayground.examples.quoteTomorrow")}
              </p>
              <p className="rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                {t("landing.preview.draftPrepared")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white px-5 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {keyPoints.map((point, index) => (
            <article className="rounded-lg border border-stone-200 bg-[#f7f6f2] p-5" key={point}>
              <p className="text-sm font-semibold text-emerald-700">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-3 text-lg font-semibold tracking-normal text-stone-950">{t(point)}</h2>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-semibold text-emerald-950">{t("landing.safety.shortCopy")}</p>
          <Link
            className="inline-flex rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
            href="/app"
          >
            {t("landing.cta.primary")}
          </Link>
        </div>
      </section>
    </main>
  );
}
