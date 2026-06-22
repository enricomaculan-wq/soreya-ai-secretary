"use client";

import { ClinicalIllustration } from "@/components/clinical-illustrations";
import { useI18n } from "@/lib/i18n";

const userStepKeys = [
  "landing.engine.userSteps.receive",
  "landing.engine.userSteps.review",
  "landing.engine.userSteps.approve",
] as const;

const engineStepKeys = [
  "landing.engine.engineSteps.read",
  "landing.engine.engineSteps.match",
  "landing.engine.engineSteps.calendar",
  "landing.engine.engineSteps.draft",
] as const;

export function EngineBehindSection() {
  const { t } = useI18n();

  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface-muted)] px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="soreya-eyebrow">{t("landing.engine.eyebrow")}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl">
            {t("landing.engine.title")}
          </h2>
          <p className="soreya-lead mt-4">{t("landing.engine.description")}</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="soreya-card p-6 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-subtle)]">
              {t("landing.engine.userSide")}
            </p>
            <h3 className="mt-2 text-lg font-medium tracking-[-0.02em] text-[var(--foreground)]">{t("landing.engine.userSideTitle")}</h3>
            <ol className="mt-6 space-y-4">
              {userStepKeys.map((key, index) => (
                <li className="flex items-start gap-3" key={key}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--trust-border)] bg-[var(--trust-soft)] text-[var(--trust)]">
                    <ClinicalIllustration size={24} variant={index === 0 ? "trust-setup" : index === 1 ? "approvals" : "trust-control"} />
                  </span>
                  <p className="pt-0.5 text-[14px] leading-relaxed text-[var(--ink-muted)]">{t(key)}</p>
                </li>
              ))}
            </ol>
          </article>

          <article className="soreya-card relative overflow-hidden p-6 sm:p-7">
            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[var(--trust-glow)] blur-2xl" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--trust)]">
              {t("landing.engine.engineSide")}
            </p>
            <h3 className="mt-2 text-lg font-medium tracking-[-0.02em] text-[var(--foreground)]">{t("landing.engine.engineSideTitle")}</h3>
            <div className="mt-5 soreya-engine-pipeline">
              {engineStepKeys.map((key, index) => (
                <span
                  className={`soreya-engine-step ${index === engineStepKeys.length - 1 ? "soreya-engine-step-active" : ""}`}
                  key={key}
                >
                  {t(key)}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-2.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
              {engineStepKeys.map((key) => (
                <div className="flex items-center gap-2.5 text-[13px] text-[var(--ink-muted)]" key={`detail-${key}`}>
                  <span className="h-1 w-1 rounded-full bg-[var(--trust)]" />
                  {t(key)}
                </div>
              ))}
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-[var(--ink-subtle)]">{t("landing.engine.footnote")}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
