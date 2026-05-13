"use client";

import type { Json, SuggestedAction } from "@soreya/shared";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DemoPlaygroundPanel } from "@/components/demo-playground-panel";
import { useDemoSuggestedActions } from "@/lib/demo-state";
import { useI18n } from "@/lib/i18n";

type SecondaryCardKey = "dailySummary" | "emergency" | "quickCall";

const secondaryCards: SecondaryCardKey[] = ["dailySummary", "emergency", "quickCall"];

export default function DemoAppPage() {
  const { locale, t, label } = useI18n();
  const [demoActions] = useDemoSuggestedActions(locale);
  const [openCard, setOpenCard] = useState<SecondaryCardKey | null>(null);
  const recentActions = useMemo(
    () => demoActions.filter(isDemoPlaygroundAction).slice(0, 3),
    [demoActions],
  );

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-stone-950">
      <header className="border-b border-stone-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link className="text-lg font-semibold tracking-normal text-stone-950" href="/">
            {t("common.appName")}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" href="/">
              {t("navigation.home")}
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" href="/settings">
              {t("navigation.settings")}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="blue">{t("demo.badge")}</StatusPill>
            <StatusPill tone="green">{t("systemStatus.approvalFirst")}</StatusPill>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
            {t("demoApp.hero.title")}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
            {t("demoApp.hero.subtitle")}
          </p>
        </section>

        <div className="mt-6">
          <DemoPlaygroundPanel />
        </div>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">{t("demoApp.recent.title")}</h2>
              <p className="mt-1 text-sm text-stone-500">{t("demoApp.recent.subtitle")}</p>
            </div>
            <Link className="text-sm font-semibold text-stone-700 underline-offset-4 hover:underline" href="/settings">
              {t("demoApp.recent.advancedLink")}
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentActions.length > 0 ? (
              recentActions.map((action) => (
                <article className="rounded-lg border border-stone-200 bg-stone-50 p-4" key={action.id}>
                  <StatusPill tone={statusTone(action.status)}>
                    {label("approvalStatus", action.status) || action.status}
                  </StatusPill>
                  <h3 className="mt-3 text-base font-semibold tracking-normal text-stone-950">{action.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">{readActionBody(action)}</p>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600 md:col-span-3">
                {t("demoApp.recent.empty")}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          {secondaryCards.map((card) => (
            <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm" key={card}>
              <h2 className="text-lg font-semibold tracking-normal text-stone-950">
                {t(`demoApp.secondary.${card}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{t(`demoApp.secondary.${card}.description`)}</p>
              {openCard === card ? (
                <p className="mt-3 rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                  {t(`demoApp.secondary.${card}.detail`)}
                </p>
              ) : null}
              <button
                className="mt-4 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                onClick={() => setOpenCard((current) => (current === card ? null : card))}
                type="button"
              >
                {t("common.open")}
              </button>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-stone-800">
              {t("demoApp.advanced.title")}
            </summary>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-stone-600">{t("demoApp.advanced.description")}</p>
              <Link
                className="inline-flex rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
                href="/settings"
              >
                {t("dashboard.settingsCta")}
              </Link>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}

type StatusTone = "blue" | "green" | "amber" | "gray";

function StatusPill({ children, tone }: { children: string; tone: StatusTone }) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "blue"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-stone-200 bg-stone-100 text-stone-600";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

function statusTone(status: SuggestedAction["status"]): StatusTone {
  if (status === "approved") {
    return "green";
  }

  if (status === "edited" || status === "pending_approval") {
    return "amber";
  }

  return "gray";
}

function isDemoPlaygroundAction(action: SuggestedAction) {
  const payload = toJsonObject(action.draft_payload);
  return payload.demoPlayground === true;
}

function readActionBody(action: SuggestedAction) {
  const payload = toJsonObject(action.draft_payload);
  return typeof payload.body === "string" ? payload.body : action.rationale ?? action.title;
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
