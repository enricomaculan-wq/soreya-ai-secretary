"use client";

import { useI18n } from "@/lib/i18n";

const engineSteps = [
  "landing.preview.engineRead",
  "landing.preview.engineMatch",
  "landing.preview.engineCalendar",
  "landing.preview.engineDraft",
] as const;

export function MarketingUiMock({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n();

  return (
    <div className={dark ? "soreya-engine-layer overflow-hidden p-1" : "soreya-card overflow-hidden p-1 shadow-[var(--shadow-elevated)]"}>
      <div
        className={`rounded-[calc(var(--radius-lg)-4px)] p-5 sm:p-6 ${
          dark
            ? "border border-[var(--hero-border)] bg-[var(--hero-surface-elevated)]"
            : "border border-[var(--border)] bg-[var(--surface)]"
        }`}
      >
        <div className={`flex items-center justify-between gap-3 border-b pb-4 ${dark ? "border-[var(--hero-border)]" : "border-[var(--border-subtle)]"}`}>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-[var(--hero-subtle)]" : "text-[var(--ink-subtle)]"}`}>
              {t("landing.preview.pendingApproval")}
            </p>
            <p className={`mt-1 text-[13px] font-medium tracking-[-0.02em] ${dark ? "text-[var(--hero-text)]" : "text-[var(--foreground)]"}`}>
              {t("landing.preview.whatsappReply")}
            </p>
          </div>
          <span className={dark ? "soreya-engine-step-hero-active soreya-engine-step" : "soreya-badge-trust soreya-badge"}>
            {t("landing.preview.draftPrepared")}
          </span>
        </div>

        <div className={`mt-4 rounded-[var(--radius-sm)] border p-4 ${dark ? "border-[var(--hero-border)] bg-[rgba(255,255,255,0.03)]" : "border-[var(--border-subtle)] bg-[var(--surface-muted)]"}`}>
          <p className={`text-[13px] leading-relaxed ${dark ? "text-[var(--hero-muted)]" : "text-[var(--ink-muted)]"}`}>
            {t("landing.preview.sampleReply")}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={dark ? "soreya-btn-hero px-3.5 py-2 text-[12px]" : "soreya-btn-primary px-3.5 py-2 text-[12px]"}>
            {t("landing.preview.approveCta")}
          </span>
          <span className={dark ? "soreya-btn-hero-ghost px-3.5 py-2 text-[12px]" : "soreya-btn-secondary px-3.5 py-2 text-[12px]"}>
            {t("common.edit")}
          </span>
        </div>

        <div className={`mt-5 rounded-[var(--radius-sm)] border border-dashed p-4 ${dark ? "border-[rgba(94,234,212,0.22)] bg-[var(--hero-accent-soft)]" : "border-[var(--trust-border)] bg-[var(--trust-soft)]"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-[var(--hero-accent)]" : "text-[var(--trust)]"}`}>
            {t("landing.preview.engineLabel")}
          </p>
          <div className="mt-3 soreya-engine-pipeline">
            {engineSteps.map((key, index) => (
              <span
                className={
                  dark
                    ? `soreya-engine-step-hero ${index >= engineSteps.length - 2 ? "soreya-engine-step-hero-active" : ""}`
                    : `soreya-engine-step ${index >= engineSteps.length - 2 ? "soreya-engine-step-active" : ""}`
                }
                key={key}
              >
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
