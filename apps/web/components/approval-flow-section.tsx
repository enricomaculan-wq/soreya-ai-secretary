"use client";

import { PrimaryButton, SecondaryButton, SectionHeader } from "@/components/ui/primitives";
import { useI18n } from "@/lib/i18n";

const steps = [
  { number: "01", titleKey: "landing.approvalFlow.receive", bodyKey: "landing.how.steps.receive" },
  { number: "02", titleKey: "landing.approvalFlow.review", bodyKey: "landing.how.steps.prepare" },
  { number: "03", titleKey: "landing.approvalFlow.send", bodyKey: "landing.how.steps.approve" },
] as const;

export function ApprovalFlowSection() {
  const { t } = useI18n();

  return (
    <section className="border-y border-stone-200 bg-white px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <SectionHeader
          centered
          description={t("landing.approvalFlow.description")}
          eyebrow={t("landing.how.eyebrow")}
          title={t("landing.approvalFlow.title")}
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article className="soreya-card p-6" key={step.number}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{step.number}</p>
              <h3 className="mt-3 text-lg font-semibold text-stone-950">{t(step.titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{t(step.bodyKey)}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton href="/app">{t("landing.cta.primary")}</PrimaryButton>
          <SecondaryButton href="/dashboard">{t("landing.approvalFlow.dashboardCta")}</SecondaryButton>
        </div>
      </div>
    </section>
  );
}
