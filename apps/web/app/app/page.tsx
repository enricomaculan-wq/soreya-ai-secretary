"use client";

import type { Json, SuggestedAction } from "@soreya/shared";
import Link from "next/link";
import { Suspense, useMemo, useRef, useState } from "react";

import { DemoBrainCatalogSettings } from "@/components/demo-brain-settings-panel";
import { DemoPlaygroundPanel } from "@/components/demo-playground-panel";
import { DemoPresentationTour } from "@/components/demo-presentation-tour";
import { SiteHeader } from "@/components/site-header";
import { AppPageBody, AppPageHeader, AppPageShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/primitives";
import { isDemoPlaygroundAction } from "@/lib/demo-presentation";
import { useDemoSuggestedActions } from "@/lib/demo-state";
import { useI18n } from "@/lib/i18n";
import { usePresentationMode } from "@/lib/presentation-mode";
import { useScreenshotMode } from "@/lib/screenshot-mode";

export default function DemoAppPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell>
          <SiteHeader active="app" />
        </AppPageShell>
      }
    >
      <DemoAppPageContent />
    </Suspense>
  );
}

function DemoAppPageContent() {
  const { locale, t, label } = useI18n();
  const presentationMode = usePresentationMode();
  const screenshotMode = useScreenshotMode();
  const [demoActions] = useDemoSuggestedActions(locale);
  const recentSectionRef = useRef<HTMLElement>(null);
  const [highlightRecent, setHighlightRecent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null);
  const recentActions = useMemo(() => {
    const playgroundActions = demoActions.filter(isDemoPlaygroundAction);
    return playgroundActions.slice(0, 3);
  }, [demoActions]);

  function handleApproved() {
    if (presentationMode) {
      return;
    }

    recentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightRecent(true);
    window.setTimeout(() => setHighlightRecent(false), 2400);
  }

  return (
    <AppPageShell>
      <SiteHeader active="app" showDemoBadge />

      <AppPageHeader
        badges={presentationMode ? undefined : <Badge tone="trust">{t("systemStatus.approvalFirst")}</Badge>}
        description={
          presentationMode ? t("demoApp.hero.presentationSubtitle") : t("demoApp.hero.subtitle")
        }
        title={presentationMode ? t("demoApp.hero.presentationTitle") : t("demoApp.hero.title")}
      />

      <AppPageBody wide={presentationMode}>
        <DemoPresentationTour enabled={presentationMode} />

        <div className={presentationMode ? "mt-4" : "mt-6"}>
          <DemoPlaygroundPanel
            onApproved={handleApproved}
            presentationMode={presentationMode}
            screenshotMode={screenshotMode}
          />
        </div>

        {!presentationMode ? (
          <div className="mt-6 flex justify-center">
            <button
              className="soreya-btn-secondary px-4 py-2 text-[13px]"
              onClick={() => setSettingsOpen((current) => !current)}
              type="button"
            >
              {settingsOpen ? t("demoApp.settings.toggleHide") : t("demoApp.settings.toggle")}
            </button>
          </div>
        ) : null}

        {!presentationMode ? <DemoBrainCatalogSettings key={locale} open={settingsOpen} /> : null}

        {!presentationMode ? (
          <section
            className={`soreya-workspace-panel mt-8 ${highlightRecent ? "soreya-presentation-highlight" : ""}`}
            data-demo-tour="approvals"
            id="demo-recent-approvals"
            ref={recentSectionRef}
          >
          <div className="soreya-workspace-panel-header">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">
                  {t("demoApp.recent.title")}
                </h2>
                <p className="mt-1 text-[13px] text-[var(--ink-subtle)]">{t("demoApp.recent.subtitle")}</p>
              </div>
              <Link className="soreya-btn-secondary px-3 py-2 text-[13px]" href="/dashboard">
                {t("demoPlayground.approvalCelebration.viewDashboard")}
              </Link>
            </div>
          </div>
          <div className="soreya-workspace-panel-body">
            <div className="grid gap-3 md:grid-cols-3">
              {recentActions.length > 0 ? (
                recentActions.map((action) => (
                  <button
                    className="soreya-approval-item soreya-demo-recent-card-button"
                    key={action.id}
                    onClick={() => setSelectedAction(action)}
                    type="button"
                  >
                    <StatusPill tone={statusTone(action.status)}>
                      {label("approvalStatus", action.status) || action.status}
                    </StatusPill>
                    <h3 className="mt-3 text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">
                      {action.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                      {readActionBody(action)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-5 text-[13px] text-[var(--ink-muted)] md:col-span-3">
                  {t("demoApp.recent.empty")}
                </div>
              )}
            </div>
          </div>
        </section>
        ) : null}
      </AppPageBody>

      {selectedAction ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-950">{selectedAction.title}</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
              {readActionBody(selectedAction)}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
                onClick={() => setSelectedAction(null)}
                type="button"
              >
                {t("common.cancel")}
              </button>
              <Link
                className="soreya-btn-primary px-4 py-2 text-sm"
                href="/dashboard"
                onClick={() => setSelectedAction(null)}
              >
                {t("demoPlayground.approvalCelebration.viewDashboard")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </AppPageShell>
  );
}

type StatusTone = "blue" | "green" | "amber" | "gray";

function StatusPill({ children, tone }: { children: string; tone: StatusTone }) {
  const toneClass =
    tone === "green"
      ? "soreya-badge-trust"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "blue"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "soreya-badge-neutral";

  return <span className={`soreya-badge ${toneClass}`}>{children}</span>;
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

function readActionBody(action: SuggestedAction) {
  const payload = toJsonObject(action.draft_payload);
  return typeof payload.body === "string" ? payload.body : action.rationale ?? action.title;
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
