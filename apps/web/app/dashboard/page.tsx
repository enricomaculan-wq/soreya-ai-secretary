"use client";

import { Suspense } from "react";

import { ApprovalEnginePanel } from "@/components/approval-engine-panel";
import { DailySummaryPanel } from "@/components/daily-summary-panel";
import { DashboardInboxPanel } from "@/components/dashboard-inbox-panel";
import { SiteHeader } from "@/components/site-header";
import { AppPageBody, AppPageHeader, AppPageShell, WorkspacePanel } from "@/components/ui/app-shell";
import { useI18n } from "@/lib/i18n";
import { useScreenshotMode } from "@/lib/screenshot-mode";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell>
          <SiteHeader active="dashboard" />
        </AppPageShell>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const { t } = useI18n();
  const screenshotMode = useScreenshotMode();
  const marketing = screenshotMode;

  return (
    <AppPageShell>
      <SiteHeader active="dashboard" />

      <AppPageHeader
        description={t("dashboard.heroDescription")}
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
      />

      <AppPageBody wide>
        <WorkspacePanel accent="trust" description={t("dashboard.emailWhatsappRequests")} title={t("dailySummary.title")}>
          <DailySummaryPanel marketing={marketing} />
        </WorkspacePanel>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <WorkspacePanel description={t("dashboard.emailWhatsappRequests")} title={t("navigation.inbox")}>
            <DashboardInboxPanel />
          </WorkspacePanel>

          <WorkspacePanel accent="trust" description={t("safety.approvalFirst")} title={t("navigation.approvals")}>
            <ApprovalEnginePanel marketing={marketing || screenshotMode} />
          </WorkspacePanel>
        </div>
      </AppPageBody>
    </AppPageShell>
  );
}
