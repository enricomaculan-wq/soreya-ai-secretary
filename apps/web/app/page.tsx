"use client";

import { ApprovalFlowSection } from "@/components/approval-flow-section";
import {
  ClinicalIllustration,
  featureIllustrationVariants,
  trustIllustrationVariants,
} from "@/components/clinical-illustrations";
import { EngineBehindSection } from "@/components/engine-behind-section";
import { MarketingUiMock } from "@/components/marketing-ui-mock";
import { SiteHeader } from "@/components/site-header";
import { PrimaryButton, SecondaryButton, SectionHeader } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n";

const featureKeys = [
  "landing.features.unifiedInbox",
  "landing.features.approvals",
  "landing.features.dailySummary",
  "landing.features.emergency",
  "landing.features.quickCall",
  "landing.features.mobileApp",
] as const;

const trustKeys = ["landing.trust.control", "landing.trust.data", "landing.trust.setup"] as const;

const howSteps = [
  "landing.how.steps.receive",
  "landing.how.steps.understand",
  "landing.how.steps.prepare",
  "landing.how.steps.approve",
] as const;

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="home" showLocaleToggle variant="marketing" />

      <header className="soreya-hero-dark soreya-hero-grid px-5 pb-24 pt-16 text-center sm:px-6 sm:pt-20">
        <div className="soreya-hero-content mx-auto w-full max-w-[780px]">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-[var(--hero-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] font-medium tracking-[-0.01em] text-[var(--hero-muted)]">
              {t("landing.badges.approvalFirst")}
            </span>
            <span className="rounded-full border border-[rgba(94,234,212,0.2)] bg-[var(--hero-accent-soft)] px-3 py-1 text-[11px] font-medium tracking-[-0.01em] text-[var(--hero-accent)]">
              {t("landing.hero.specialty")}
            </span>
          </div>
          <p className="soreya-hero-eyebrow mt-8">{t("landing.hero.eyebrow")}</p>
          <h1 className="mt-4 text-[clamp(2.35rem,5.5vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[var(--hero-text)]">
            {t("landing.hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-[580px] text-[clamp(0.9375rem,1.8vw,1.0625rem)] leading-relaxed text-[var(--hero-muted)]">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton href="/presentazione" variant="hero">{t("landing.cta.primary")}</PrimaryButton>
            <PrimaryButton href="#how-it-works" variant="hero-ghost">{t("landing.cta.secondary")}</PrimaryButton>
          </div>
        </div>

        <div className="soreya-hero-content mx-auto mt-16 w-full max-w-[600px]">
          <MarketingUiMock dark />
        </div>
      </header>

      <section className="border-y border-[var(--border)] bg-white px-5 py-14 sm:px-6">
        <div className="mx-auto grid max-w-[1100px] gap-10 md:grid-cols-3">
          {trustKeys.map((key, index) => (
            <article className="text-center" key={key}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--trust-border)] bg-[var(--trust-soft)] text-[var(--trust)]">
                <ClinicalIllustration size={34} variant={trustIllustrationVariants[index]} />
              </div>
              <h2 className="mt-4 text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">{t(`${key}.title`)}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-subtle)]">{t(`${key}.text`)}</p>
            </article>
          ))}
        </div>
      </section>

      <EngineBehindSection />

      <section className="px-5 py-20 sm:px-6" id="benefici">
        <div className="mx-auto max-w-[1100px]">
          <SectionHeader
            centered
            description={t("landing.solution.description")}
            eyebrow={t("landing.features.eyebrow")}
            title={t("landing.solution.title")}
          />

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((feature, index) => (
              <article className="soreya-card p-5" key={feature}>
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--trust-border)] bg-[var(--trust-soft)] text-[var(--trust)]">
                  <ClinicalIllustration size={32} variant={featureIllustrationVariants[index]} />
                </div>
                <h3 className="mt-4 text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">{t(feature)}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ApprovalFlowSection />

      <section className="border-t border-[var(--border)] bg-white px-5 py-20 sm:px-6" id="how-it-works">
        <div className="mx-auto max-w-[1100px]">
          <SectionHeader centered eyebrow={t("landing.how.eyebrow")} title={t("landing.how.title")} />
          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {howSteps.map((step, index) => (
              <article className="soreya-card p-5" key={step}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--trust)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 text-[15px] font-medium leading-snug tracking-[-0.02em] text-[var(--foreground)]">{t(step)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface-muted)] px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-[680px] text-center">
          <SectionHeader
            centered
            description={t("landing.safety.description")}
            eyebrow={t("landing.safety.eyebrow")}
            title={t("landing.safety.title")}
          />
          <ul className="mt-8 grid gap-2 sm:grid-cols-3">
            {(["noAutomaticActions", "approvalFirst", "demoDryRun"] as const).map((item) => (
              <li className="soreya-card px-4 py-3 text-[13px] font-medium text-[var(--ink-muted)]" key={item}>
                {t(`landing.safety.items.${item}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-20 text-center sm:px-6">
        <div className="mx-auto max-w-[680px]">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl">{t("landing.demo.title")}</h2>
          <p className="soreya-lead mt-4">{t("landing.demo.description")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton href="/presentazione">{t("landing.cta.primary")}</PrimaryButton>
            <SecondaryButton href="/dashboard">{t("landing.approvalFlow.dashboardCta")}</SecondaryButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-5 py-12 text-center sm:px-6">
        <p className="text-[13px] font-medium tracking-[0.06em] text-[var(--foreground)]">SOREYA</p>
        <p className="mt-2 text-[13px] text-[var(--ink-subtle)]">{t("landing.footer.tagline")}</p>
        <p className="mt-8 text-[11px] text-[var(--ink-subtle)]">&copy; 2026 Soreya</p>
      </footer>
    </main>
  );
}
