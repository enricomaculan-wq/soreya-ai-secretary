"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SupportedLocale } from "@soreya/shared";

import { BrandLogo } from "@/components/brand-logo";
import { shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";

type SiteHeaderProps = {
  active?: "home" | "app" | "dashboard" | "settings";
  showLocaleToggle?: boolean;
  showDemoBadge?: boolean;
  variant?: "app" | "marketing";
};

export function SiteHeader({
  active = "home",
  showLocaleToggle = false,
  showDemoBadge = false,
  variant = "app",
}: SiteHeaderProps) {
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const isMarketing = variant === "marketing";
  const demoMode = shouldUseWebDemoData() || showDemoBadge || pathname === "/app" || pathname === "/presentazione";
  const presentationHref = "/presentazione";

  const appLinkClass = (key: SiteHeaderProps["active"]) =>
    `rounded-md px-3 py-1.5 text-[13px] font-medium tracking-[-0.01em] transition-colors ${
      active === key
        ? "bg-[var(--app-nav-active-bg)] text-[var(--foreground)]"
        : "text-[var(--ink-muted)] hover:bg-[var(--app-stone-100)] hover:text-[var(--foreground)]"
    }`;

  const marketingLinkClass = (key: SiteHeaderProps["active"]) =>
    `text-[13px] font-medium tracking-[-0.01em] transition-colors ${
      active === key ? "text-[var(--hero-text)]" : "text-[var(--hero-muted)] hover:text-[var(--hero-text)]"
    }`;

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        isMarketing
          ? "border-[var(--hero-border)] bg-[rgba(8,9,10,0.82)]"
          : "border-[var(--app-stone-border)] bg-[var(--app-header-bg)]"
      }`}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          className={`flex items-center gap-2.5 ${isMarketing ? "text-[var(--hero-text)]" : "text-[var(--foreground)]"}`}
          href="/"
        >
          <BrandLogo size={30} />
          <span className="text-[15px] font-medium tracking-[-0.02em]">{t("common.appName")}</span>
          {demoMode && !isMarketing ? <span className="soreya-demo-mode-badge">{t("demo.badge")}</span> : null}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link className={isMarketing ? marketingLinkClass("home") : appLinkClass("home")} href="/">
            {t("navigation.home")}
          </Link>
          <Link className={isMarketing ? marketingLinkClass("app") : appLinkClass("app")} href="/app">
            {t("navigation.demoWorkspace")}
          </Link>
          <Link className={isMarketing ? marketingLinkClass("dashboard") : appLinkClass("dashboard")} href="/dashboard">
            {t("navigation.dashboard")}
          </Link>
          <Link className={isMarketing ? marketingLinkClass("settings") : appLinkClass("settings")} href="/settings">
            {t("navigation.settings")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {showLocaleToggle ? (
            <div
              className={`flex items-center gap-0.5 rounded-md border p-0.5 ${
                isMarketing
                  ? "border-[var(--hero-border)] bg-[rgba(255,255,255,0.04)]"
                  : "border-[var(--app-stone-border)] bg-[var(--app-stone-100)]"
              }`}
            >
              {(["it", "en"] as SupportedLocale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    locale === code
                      ? isMarketing
                        ? "bg-[var(--hero-text)] text-[var(--hero-bg)]"
                        : "bg-white text-[var(--foreground)] shadow-sm"
                      : isMarketing
                        ? "text-[var(--hero-subtle)] hover:text-[var(--hero-text)]"
                        : "text-[var(--ink-subtle)] hover:text-[var(--foreground)]"
                  }`}
                  onClick={() => setLocale(code)}
                >
                  {code}
                </button>
              ))}
            </div>
          ) : null}
          <Link
            className={
              isMarketing
                ? "soreya-btn-hero hidden px-3.5 py-2 text-[13px] sm:inline-flex"
                : "soreya-btn-primary hidden px-3.5 py-2 text-[13px] sm:inline-flex"
            }
            href={isMarketing ? presentationHref : "/app"}
          >
            {t("landing.cta.primary")}
          </Link>
        </div>
      </div>
    </header>
  );
}
