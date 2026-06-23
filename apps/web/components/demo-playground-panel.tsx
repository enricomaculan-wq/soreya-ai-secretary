"use client";

import {
  analyzeDemoCustomerRequest,
  buildDemoApprovalFromRequest,
  formatServicePrice,
  resolveCombinedServiceDurationMinutes,
  type ApprovalState,
  type DemoCustomerRequestAnalysis,
  type DemoDetectedIntent,
  type DemoPlaygroundChannel,
  type Json,
  type OrganizationService,
  type SuggestedAction,
  type SupportedLocale,
  resolveDemoPatientFirstName,
} from "@soreya/shared";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import { matchDemoServicesFromText } from "@/lib/demo-presentation";
import { readDemoBrainOverrides } from "@/lib/demo-brain-store";
import { getWebDemoData } from "@/lib/demo-data";
import {
  buildConversationHistory,
  useDemoPlaygroundSession,
} from "@/lib/demo-playground-session";
import { readCachedDemoAnalysis, writeCachedDemoAnalysis } from "@/lib/demo-presentation-cache";
import { useDemoSuggestedActions } from "@/lib/demo-state";
import { useI18n } from "@/lib/i18n";
import { DemoPlaygroundCalendarStrip } from "@/components/demo-playground-calendar-strip";

type DemoPlaygroundPanelProps = {
  compact?: boolean;
  onApproved?: () => void;
  presentationMode?: boolean;
  screenshotMode?: boolean;
};

type DemoActionStatus = Extract<ApprovalState, "pending_approval" | "approved" | "edited" | "ignored">;

const channels: DemoPlaygroundChannel[] = ["email", "whatsapp", "quick_call"];

const analysisProgressSteps = [
  "demoPlayground.progress.steps.readingMessage",
  "demoPlayground.progress.steps.matchingCatalog",
  "demoPlayground.progress.steps.checkingCalendar",
  "demoPlayground.progress.steps.draftingReply",
] as const;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function DemoPlaygroundPanel({
  compact = false,
  onApproved,
  presentationMode = false,
  screenshotMode = false,
}: DemoPlaygroundPanelProps) {
  const { locale, t } = useI18n();
  const [, setDemoActions] = useDemoSuggestedActions(locale);
  const {
    session: playgroundSession,
    appendCustomerMessage,
    setDraftReply,
    holdProposalSlots,
    clearProposalSlots,
    approveDraft,
    removeDraft,
    resetSession,
  } = useDemoPlaygroundSession(locale);
  const holdProgressRef = useRef(false);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const screenshotSeed = screenshotMode && !presentationMode ? buildScreenshotSeed(locale, t) : null;
  const [channel, setChannel] = useState<DemoPlaygroundChannel>(
    presentationMode || screenshotSeed ? "whatsapp" : "whatsapp",
  );
  const [senderText, setSenderText] = useState(screenshotSeed?.senderText ?? "");
  const [customerText, setCustomerText] = useState(screenshotSeed?.customerText ?? "");
  const [analysis, setAnalysis] = useState<DemoCustomerRequestAnalysis | null>(screenshotSeed?.analysis ?? null);
  const [editedReply, setEditedReply] = useState(screenshotSeed?.editedReply ?? "");
  const [draftActionId, setDraftActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [operatorAttentionOpen, setOperatorAttentionOpen] = useState(false);
  const [approvalCelebrationOpen, setApprovalCelebrationOpen] = useState(false);
  const visibleChannels = presentationMode ? (["whatsapp"] as DemoPlaygroundChannel[]) : channels;
  const useChatLayout = channel === "whatsapp" || presentationMode;
  const hasPendingDraft =
    useChatLayout && playgroundSession.messages.some((message) => message.status === "draft");

  useEffect(() => {
    if (!useChatLayout || !analysis || !editedReply) {
      return;
    }

    setDraftReply(editedReply);
  }, [analysis, editedReply, setDraftReply, useChatLayout]);

  async function runAnalysis(overrides?: {
    channel?: DemoPlaygroundChannel;
    customerText?: string;
    senderText?: string;
  }) {
    const activeChannel = overrides?.channel ?? channel;
    const activeCustomerText = overrides?.customerText ?? customerText;
    const activeSenderText = overrides?.senderText ?? senderText;

    if (!activeCustomerText.trim()) {
      return;
    }

    holdProgressRef.current = false;
    setError(null);
    setToastMessage(null);
    setApprovalCelebrationOpen(false);

    const cached = readCachedDemoAnalysis(locale, activeCustomerText);
    const showProgress = !cached;

    if (useChatLayout) {
      appendCustomerMessage(activeCustomerText);
      setCustomerText("");
    }

    if (cached) {
      setAnalysis(cached);
      setEditedReply(cached.suggestedReply);
      setDraftActionId(null);
      if (useChatLayout) {
        setDraftReply(cached.suggestedReply);
        holdProposalSlots(
          cached,
          resolveDemoPatientFirstName(cached.senderName, cached.customerName),
          cached.suggestedReply,
        );
      }
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStepIndex(0);

    try {
      const { services } = readDemoBrainOverrides(locale);
      const conversationHistory = useChatLayout
        ? buildConversationHistory(playgroundSession.messages)
        : undefined;

      const response = await fetch("/api/demo/analyze-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: activeChannel,
          senderText: activeSenderText,
          customerText: activeCustomerText,
          locale,
          demoServices: services,
          conversationHistory,
        }),
      });
      const body = await response.json() as unknown;

      if (!response.ok) {
        throw new Error(readErrorMessage(body) ?? t("common.unavailable"));
      }

      if (!isDemoAnalysisResponse(body)) {
        throw new Error(t("common.unavailable"));
      }

      setAnalysis(body);
      setEditedReply(body.suggestedReply);
      setDraftActionId(null);
      writeCachedDemoAnalysis(locale, activeCustomerText, body);
      if (useChatLayout) {
        setDraftReply(body.suggestedReply);
        holdProposalSlots(
          body,
          resolveDemoPatientFirstName(body.senderName, body.customerName),
          body.suggestedReply,
        );
      }
      const needsOperatorAttention = Boolean(body.requiresOperatorAttention);
      setOperatorAttentionOpen(presentationMode && needsOperatorAttention);
      if (showProgress) {
        holdProgressRef.current = true;
        setAnalysisProgress(100);
        setAnalysisStepIndex(analysisProgressSteps.length - 1);
        await wait(380);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("common.unavailable"));
    } finally {
      holdProgressRef.current = false;
      if (showProgress) {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setAnalysisStepIndex(0);
      }
    }
  }

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (holdProgressRef.current) {
        return;
      }

      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(92, 92 * (1 - Math.exp(-elapsed / 2600)));
      setAnalysisProgress(nextProgress);
      setAnalysisStepIndex(
        Math.min(
          analysisProgressSteps.length - 1,
          Math.floor((nextProgress / 92) * analysisProgressSteps.length),
        ),
      );
    }, 90);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  function handleResetDemo() {
    resetSession();
    setAnalysis(null);
    setEditedReply("");
    setCustomerText("");
    setDraftActionId(null);
    setError(null);
    setToastMessage(null);
    setApprovalCelebrationOpen(false);
    setOperatorAttentionOpen(false);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setAnalysisStepIndex(0);
  }

  useEffect(() => {
    if (!analysis?.requiresOperatorAttention) {
      return;
    }

    resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [analysis?.requiresOperatorAttention, analysis?.summary]);

  function upsertDemoAction(status: DemoActionStatus) {
    if (!analysis) {
      return;
    }

    const action = buildAction(status);

    setDemoActions((current) => [
      action,
      ...current.filter((item) => item.id !== action.id),
    ]);
    setDraftActionId(action.id);
  }

  function buildAction(status: DemoActionStatus): SuggestedAction {
    if (!analysis) {
      throw new Error("Missing demo playground analysis.");
    }

    const baseAction = buildDemoApprovalFromRequest({
      ...analysis,
      suggestedReply: editedReply,
    });
    const now = new Date().toISOString();
    const demo = getWebDemoData(locale);
    const payload = toJsonObject(baseAction.draft_payload);

    return {
      ...baseAction,
      id: draftActionId ?? baseAction.id,
      status,
      draft_payload: {
        ...payload,
        body: editedReply,
        editedInDemo: editedReply !== analysis.suggestedReply,
      },
      approved_by: status === "approved" ? demo.membership.user_id : null,
      approved_at: status === "approved" ? now : null,
      updated_at: now,
    };
  }

  function handleApprove() {
    upsertDemoAction("approved");
    if (useChatLayout && analysis) {
      approveDraft(
        analysis,
        editedReply,
        resolveDemoPatientFirstName(analysis.senderName, analysis.customerName),
      );
      setAnalysis(null);
      setEditedReply("");
    }
    setToastMessage(t("demoPlayground.presentation.approvedToast"));
    setApprovalCelebrationOpen(true);
    onApproved?.();
  }

  function handleEdit() {
    upsertDemoAction("edited");
    if (useChatLayout) {
      setDraftReply(editedReply);
    }
  }

  function handleIgnore() {
    upsertDemoAction("ignored");
    if (useChatLayout) {
      removeDraft();
      clearProposalSlots();
      setAnalysis(null);
      setEditedReply("");
    }
  }

  const appointmentContextLabel = analysis
    ? analysis.detectedIntent === "cancel_appointment"
      ? t("demoPlayground.linkedAppointments")
      : analysis.isThirdPartyRequest
        ? t("demoPlayground.thirdPartyRequest")
        : analysis.hasMultipleRequests
          ? t("demoPlayground.detectedRequests")
          : analysis.detectedIntent === "appointment_lookup"
            ? t("demoPlayground.linkedAppointment")
            : t("demoPlayground.results.linkedAppointment")
    : "";

  return (
    <>
    {operatorAttentionOpen && analysis?.requiresOperatorAttention
      ? createPortal(
          <OperatorAttentionModal
            analysis={analysis}
            onDismiss={() => setOperatorAttentionOpen(false)}
            t={t}
          />,
          document.body,
        )
      : null}

    {approvalCelebrationOpen
      ? createPortal(
          <ApprovalCelebrationModal
            onClose={() => setApprovalCelebrationOpen(false)}
            onViewDashboard={() => {
              setApprovalCelebrationOpen(false);
              window.location.href = "/dashboard";
            }}
            t={t}
          />,
          document.body,
        )
      : null}

    <section
      className={`soreya-demo-editorial ${useChatLayout ? "soreya-demo-editorial-workspace" : ""}`}
      data-demo-tour="compose"
    >
      {toastMessage ? <p className="soreya-demo-editorial-toast">{toastMessage}</p> : null}
      {!useChatLayout ? <p className="soreya-demo-editorial-safe">{t("demoPlayground.safeDemoShort")}</p> : null}

      {useChatLayout ? (
        <div className="soreya-demo-workspace">
          <div className="soreya-demo-workspace-main">
            <div className="soreya-demo-chat">
              <div className="soreya-demo-chat-header">
                <span className="soreya-demo-chat-avatar">WA</span>
                <div className="soreya-demo-chat-header-copy">
                  <p className="soreya-demo-chat-contact-name">
                    {senderText || t("demoPlayground.senderPlaceholders.whatsapp")}
                  </p>
                  <p className="soreya-demo-chat-contact-meta">{t("demoPlayground.channels.whatsapp")}</p>
                </div>
                <button
                  className="soreya-demo-reset-btn"
                  onClick={handleResetDemo}
                  title={t("demoPlayground.resetHint")}
                  type="button"
                >
                  {t("demoPlayground.reset")}
                </button>
              </div>

              <div className="soreya-demo-chat-thread">
                {playgroundSession.messages.length === 0 ? (
                  <p className="text-center text-sm text-stone-500">{t("demoPlayground.conversation.emptyHint")}</p>
                ) : (
                  playgroundSession.messages.map((message) => (
                    <div
                      className={
                        message.role === "customer"
                          ? "soreya-demo-chat-bubble-in"
                          : message.status === "draft"
                            ? "soreya-demo-chat-bubble-out-draft"
                            : "soreya-demo-chat-bubble-out-sent"
                      }
                      key={message.id}
                    >
                      <p>{message.body}</p>
                      {message.role === "studio" ? (
                        <span className="soreya-demo-chat-bubble-badge">
                          {message.status === "draft"
                            ? t("demoPlayground.conversation.draftBadge")
                            : t("demoPlayground.conversation.sentBadge")}
                        </span>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <div className="soreya-demo-chat-compose">
                {!presentationMode ? (
                  <input
                    aria-label={t("demoPlayground.sender")}
                    className="mb-3 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                    onChange={(event) => {
                      setSenderText(event.target.value);
                      setError(null);
                    }}
                    placeholder={t("demoPlayground.senderPlaceholders.whatsapp")}
                    value={senderText}
                  />
                ) : null}

                <div className="soreya-demo-chat-input-row">
                  <textarea
                    onChange={(event) => {
                      setCustomerText(event.target.value);
                      setError(null);
                    }}
                    placeholder={
                      playgroundSession.messages.length > 0
                        ? t("demoPlayground.conversation.composePlaceholder")
                        : t("demoPlayground.placeholder")
                    }
                    rows={2}
                    value={customerText}
                  />
                  <button
                    className="soreya-btn-primary soreya-demo-chat-analyze"
                    disabled={isAnalyzing || !customerText.trim() || hasPendingDraft}
                    onClick={() => void runAnalysis()}
                    type="button"
                  >
                    {isAnalyzing
                      ? presentationMode
                        ? t("demoPlayground.analyzingPresentation")
                        : t("demoPlayground.analyzing")
                      : t("demoPlayground.analyzeButton")}
                  </button>
                </div>

                {hasPendingDraft ? (
                  <p className="soreya-demo-chat-pending-hint">{t("demoPlayground.presentation.pendingHint")}</p>
                ) : null}
              </div>
            </div>

            {isAnalyzing ? (
              <div className="soreya-demo-workspace-progress">
                <DemoAnalysisProgressBar
                  progress={analysisProgress}
                  stepKey={analysisProgressSteps[analysisStepIndex]}
                  t={t}
                />
              </div>
            ) : null}

            {error ? (
              <p className="soreya-demo-workspace-error">{error}</p>
            ) : null}
          </div>

          <aside className="soreya-demo-workspace-side">
            <div className="soreya-demo-side-panel" data-demo-tour="analysis">
              {analysis ? (
                <DemoAnalysisResultBody
                  analysis={analysis}
                  appointmentContextLabel={appointmentContextLabel}
                  compact
                  editedReply={editedReply}
                  handleApprove={handleApprove}
                  handleEdit={handleEdit}
                  handleIgnore={handleIgnore}
                  locale={locale}
                  resultRef={resultSectionRef}
                  setEditedReply={setEditedReply}
                  t={t}
                />
              ) : (
                <DemoSideEmptyState isAnalyzing={isAnalyzing} t={t} />
              )}
            </div>

            <DemoPlaygroundCalendarStrip
              compact
              events={playgroundSession.calendarEvents}
              highlightedEventIds={playgroundSession.highlightedEventIds}
              pendingConfirmationEventIds={playgroundSession.pendingConfirmationEventIds}
              locale={locale}
            />
          </aside>
        </div>
      ) : (
        <>
          <div className="soreya-demo-editorial-compose">
            <div className="soreya-demo-editorial-meta">
              <div className="soreya-demo-editorial-channels" role="tablist">
                {visibleChannels.map((item) => (
                  <button
                    aria-selected={channel === item}
                    className={`soreya-demo-editorial-channel ${
                      channel === item ? "soreya-demo-editorial-channel-active" : ""
                    }`}
                    key={item}
                    onClick={() => setChannel(item)}
                    role="tab"
                    type="button"
                  >
                    {t(`demoPlayground.channels.${item === "quick_call" ? "quickCall" : item}`)}
                  </button>
                ))}
              </div>
              <input
                aria-label={t("demoPlayground.sender")}
                className="soreya-demo-editorial-sender"
                onChange={(event) => {
                  setSenderText(event.target.value);
                  setError(null);
                }}
                placeholder={t(`demoPlayground.senderPlaceholders.${channel === "quick_call" ? "quickCall" : channel}`)}
                value={senderText}
              />
            </div>

            <div className="soreya-demo-editorial-surface">
              <textarea
                onChange={(event) => {
                  setCustomerText(event.target.value);
                  setError(null);
                }}
                placeholder={t("demoPlayground.placeholder")}
                rows={compact ? 4 : 5}
                value={customerText}
              />
            </div>

            <div className="soreya-demo-editorial-actions">
              <button
                className="soreya-btn-primary px-5 py-2.5 text-sm"
                disabled={isAnalyzing || !customerText.trim()}
                onClick={() => void runAnalysis()}
                type="button"
              >
                {isAnalyzing ? t("demoPlayground.analyzing") : t("demoPlayground.analyzeButton")}
              </button>
            </div>

            {isAnalyzing ? (
              <DemoAnalysisProgressBar
                progress={analysisProgress}
                stepKey={analysisProgressSteps[analysisStepIndex]}
                t={t}
              />
            ) : null}

            {error ? (
              <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-900">
                {error}
              </p>
            ) : null}
          </div>

          {analysis ? (
            <div className="soreya-demo-editorial-result" data-demo-tour="analysis" ref={resultSectionRef}>
              <DemoAnalysisResultBody
                analysis={analysis}
                appointmentContextLabel={appointmentContextLabel}
                editedReply={editedReply}
                handleApprove={handleApprove}
                handleEdit={handleEdit}
                handleIgnore={handleIgnore}
                locale={locale}
                setEditedReply={setEditedReply}
                t={t}
              />
            </div>
          ) : null}
        </>
      )}
    </section>
    </>
  );
}

function ApprovalCelebrationModal({
  onClose,
  onViewDashboard,
  t,
}: {
  onClose: () => void;
  onViewDashboard: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="soreya-demo-approval-celebration-backdrop" role="dialog">
      <div className="soreya-demo-approval-celebration-card">
        <div className="soreya-demo-approval-celebration-icon">✓</div>
        <h3 className="mt-4 text-lg font-semibold text-stone-950">{t("demoPlayground.approvalCelebration.title")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">{t("demoPlayground.approvalCelebration.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button className="soreya-btn-primary px-4 py-2 text-sm" onClick={onViewDashboard} type="button">
            {t("demoPlayground.approvalCelebration.viewDashboard")}
          </button>
          <button className="soreya-btn-secondary px-4 py-2 text-sm" onClick={onClose} type="button">
            {t("demoPlayground.approvalCelebration.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoSideEmptyState({ isAnalyzing, t }: { isAnalyzing: boolean; t: (key: string) => string }) {
  return (
    <div className="soreya-demo-side-empty">
      <p className="soreya-demo-side-empty-title">{t("demoPlayground.sidePanel.emptyTitle")}</p>
      <p className="soreya-demo-side-empty-hint">
        {isAnalyzing ? t("demoPlayground.conversation.analyzing") : t("demoPlayground.sidePanel.emptyHint")}
      </p>
    </div>
  );
}

function DemoAnalysisResultBody({
  analysis,
  appointmentContextLabel,
  compact = false,
  editedReply,
  handleApprove,
  handleEdit,
  handleIgnore,
  locale,
  resultRef,
  setEditedReply,
  t,
}: {
  analysis: DemoCustomerRequestAnalysis;
  appointmentContextLabel: string;
  compact?: boolean;
  editedReply: string;
  handleApprove: () => void;
  handleEdit: () => void;
  handleIgnore: () => void;
  locale: SupportedLocale;
  resultRef?: RefObject<HTMLDivElement | null>;
  setEditedReply: (value: string) => void;
  t: (key: string) => string;
}) {
  const draftPanel = (
    <div className={`soreya-demo-editorial-draft ${compact ? "soreya-demo-editorial-draft-compact" : ""}`}>
      <div className="soreya-demo-editorial-draft-head">
        <p className="soreya-demo-editorial-draft-title">{labelReadyReply(analysis, t)}</p>
        <span className="soreya-demo-editorial-badge">
          {analysis.requiresOperatorAttention
            ? t("demoPlayground.operatorAttention.draftBadge")
            : t("landing.preview.draftPrepared")}
        </span>
      </div>
      <textarea
        className="soreya-demo-editorial-reply"
        onChange={(event) => setEditedReply(event.target.value)}
        placeholder={
          analysis.requiresOperatorAttention
            ? t("demoPlayground.operatorAttention.draftPlaceholder")
            : undefined
        }
        rows={compact ? 5 : 6}
        value={editedReply}
      />
      <div className="soreya-demo-editorial-draft-actions">
        <button className="soreya-btn-primary px-4 py-2 text-sm" onClick={handleApprove} type="button">
          {t("demoPlayground.actions.approveResponse")}
        </button>
        <button className="soreya-btn-secondary px-4 py-2 text-sm" onClick={handleEdit} type="button">
          {t("common.edit")}
        </button>
        <button className="soreya-btn-secondary px-4 py-2 text-sm" onClick={handleIgnore} type="button">
          {t("common.ignore")}
        </button>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div ref={resultRef}>
        {analysis.requiresOperatorAttention ? <OperatorAttentionBanner analysis={analysis} t={t} /> : null}
        <p className="soreya-demo-side-summary">{buildUnderstandingSummary(analysis, t)}</p>
        <details className="soreya-demo-side-details">
          <summary>{t("demoPlayground.sidePanel.detailsSummary")}</summary>
          <EditorialSection label={t("demoPlayground.results.sender")} value={buildSenderSummary(analysis, t)} />
          <ServicesTimingBlock analysis={analysis} locale={locale} t={t} />
          <EditorialSection
            label={appointmentContextLabel}
            value={buildAppointmentContextSummary(analysis, locale, t)}
          />
        </details>
        {draftPanel}
      </div>
    );
  }

  return (
    <div ref={resultRef}>
      {analysis.requiresOperatorAttention ? <OperatorAttentionBanner analysis={analysis} t={t} /> : null}
      <EditorialSection label={t("demoPlayground.results.sender")} value={buildSenderSummary(analysis, t)} />
      <EditorialSection
        label={t("demoPlayground.results.understood")}
        value={buildUnderstandingSummary(analysis, t)}
      />
      <ServicesTimingBlock analysis={analysis} locale={locale} t={t} />
      <EditorialSection
        label={appointmentContextLabel}
        value={buildAppointmentContextSummary(analysis, locale, t)}
      />
      {draftPanel}
    </div>
  );
}

function OperatorAttentionBanner({
  analysis,
  t,
}: {
  analysis: DemoCustomerRequestAnalysis;
  t: (key: string) => string;
}) {
  const reasonKey = analysis.operatorAttentionCategory ?? "general";

  return (
    <div className="soreya-operator-attention-banner" role="alert">
      <p className="soreya-operator-attention-banner-title">{t("demoPlayground.operatorAttention.title")}</p>
      <p>{t("demoPlayground.operatorAttention.description")}</p>
      <p className="soreya-operator-attention-banner-reason">
        {t(`demoPlayground.operatorAttention.reasons.${reasonKey}`)}
      </p>
    </div>
  );
}

function OperatorAttentionModal({
  analysis,
  onDismiss,
  t,
}: {
  analysis: DemoCustomerRequestAnalysis;
  onDismiss: () => void;
  t: (key: string) => string;
}) {
  const reasonKey = analysis.operatorAttentionCategory ?? "general";

  return (
    <div className="soreya-operator-attention-backdrop" role="presentation">
      <div
        aria-labelledby="operator-attention-title"
        aria-modal="true"
        className="soreya-operator-attention-modal"
        role="alertdialog"
      >
        <h3 id="operator-attention-title">{t("demoPlayground.operatorAttention.title")}</h3>
        <p>{t("demoPlayground.operatorAttention.description")}</p>
        <p className="soreya-operator-attention-reason">
          {t(`demoPlayground.operatorAttention.reasons.${reasonKey}`)}
        </p>
        <div className="soreya-operator-attention-actions">
          <button className="soreya-btn-primary px-4 py-2 text-[13px]" onClick={onDismiss} type="button">
            {t("demoPlayground.operatorAttention.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoAnalysisProgressBar({
  progress,
  stepKey,
  t,
}: {
  progress: number;
  stepKey: (typeof analysisProgressSteps)[number];
  t: (key: string) => string;
}) {
  return (
    <div aria-busy="true" aria-live="polite" className="soreya-demo-analysis-progress">
      <div className="soreya-demo-analysis-progress-head">
        <span>{t(stepKey)}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="soreya-demo-analysis-progress-track">
        <div className="soreya-demo-analysis-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function EditorialSection({ label, value }: { label: string; value: string }) {
  return (
    <div className="soreya-demo-editorial-section">
      <p className="soreya-demo-editorial-eyebrow">{label}</p>
      <p className="soreya-demo-editorial-prose">{value}</p>
    </div>
  );
}

function ServicesTimingBlock({
  analysis,
  locale,
  t,
}: {
  analysis: DemoCustomerRequestAnalysis;
  locale: SupportedLocale;
  t: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;
}) {
  const matchedServices = matchDemoServicesFromText(
    analysis.customerText,
    analysis.reason,
    locale,
    readDemoBrainOverrides(locale).services,
  );

  if (matchedServices.length === 0) {
    return null;
  }

  const localeTag = locale === "it" ? "it-IT" : "en-US";
  const combinedMinutes = resolveCombinedServiceDurationMinutes(matchedServices);

  return (
    <div className="soreya-demo-editorial-services">
      <p className="soreya-demo-editorial-eyebrow">{t("demoPlayground.servicesAndTiming.title")}</p>
      <ul>
        {matchedServices.map((service) => (
          <li key={service.id}>{formatServiceLine(service, localeTag, t)}</li>
        ))}
      </ul>
      {matchedServices.length > 1 ? (
        <p className="soreya-demo-editorial-services-note">
          {t("demoPlayground.servicesAndTiming.combinedDuration", { minutes: combinedMinutes })}
        </p>
      ) : null}
      <p className="soreya-demo-editorial-services-note">
        {t("demoPlayground.servicesAndTiming.slotNeeded", { minutes: combinedMinutes })}
      </p>
    </div>
  );
}

function formatServiceLine(
  service: OrganizationService,
  localeTag: string,
  t: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  const price = formatServicePrice(service, localeTag) ?? t("demoPlayground.servicesAndTiming.quoteOnRequest");

  return t("demoPlayground.servicesAndTiming.serviceLine", {
    name: service.name,
    duration: service.durationMinutes,
    price,
  });
}

function isDemoAnalysisResponse(value: unknown): value is DemoCustomerRequestAnalysis {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as DemoCustomerRequestAnalysis).detectedIntent === "string" &&
    typeof (value as DemoCustomerRequestAnalysis).suggestedReply === "string" &&
    typeof (value as DemoCustomerRequestAnalysis).confidence === "number",
  );
}

function readErrorMessage(value: unknown) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { error?: unknown }).error === "string"
    ? (value as { error: string }).error
    : null;
}

function buildUnderstandingSummary(
  analysis: DemoCustomerRequestAnalysis,
  translate: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  if (analysis.summary) {
    return analysis.summary;
  }

  const requestedTime = analysis.requestedDateTimeText ?? translate("demoPlayground.results.noRequestedTime");
  const summaryKeyByIntent: Record<DemoDetectedIntent, string> = {
    new_appointment: "demoPlayground.summary.newAppointment",
    reschedule_appointment: "demoPlayground.summary.reschedule",
    delay_notice: "demoPlayground.summary.delay",
    cancel_appointment: "demoPlayground.summary.cancellation",
    appointment_lookup: "demoPlayground.summary.appointmentLookup",
    appointment_confirmation: "demoPlayground.summary.appointmentConfirmation",
    callback_request: "demoPlayground.summary.callback",
    manual_review: "demoPlayground.summary.manualReview",
  };

  return translate(summaryKeyByIntent[analysis.detectedIntent], {
    requestedTime,
    confirmedTime: analysis.requestedDateTimeText ?? requestedTime,
  });
}

function buildSenderSummary(
  analysis: DemoCustomerRequestAnalysis,
  translate: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  if (!analysis.customerIdentified) {
    const visibleSender = analysis.senderName || translate("demoPlayground.unidentifiedSender");
    return `${visibleSender}. ${translate("demoPlayground.customerNotIdentified")}`;
  }

  return [
    analysis.senderName ?? translate("demoPlayground.unidentifiedSender"),
    analysis.senderContact ? `${translate("demoPlayground.senderContact")}: ${analysis.senderContact}` : null,
    analysis.senderSource ? translate(`demoPlayground.channels.${analysis.senderSource === "quick_call" ? "quickCall" : analysis.senderSource}`) : null,
  ].filter(Boolean).join(" · ");
}

function buildAppointmentContextSummary(
  analysis: DemoCustomerRequestAnalysis,
  locale: "it" | "en",
  translate: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  const alternatives = analysis.alternatives
    .slice(0, 2)
    .map((slot) => formatTime(slot.startsAt, locale))
    .join(" / ");

  if (analysis.detectedIntent === "cancel_appointment") {
    const appointments = analysis.linkedAppointments?.length
      ? analysis.linkedAppointments
      : [];
    const scopeLabel = analysis.cancellationScope === "all_future"
      ? translate("demoPlayground.allFutureAppointments")
      : translate("demoPlayground.singleAppointment");

    return [
      translate("demoPlayground.demoAppointmentsFound"),
      `${translate("demoPlayground.cancellationScope")}: ${scopeLabel}`,
      ...appointments.map((appointment) => `- ${appointment.startsAtText} — ${appointment.reason}`),
    ].join("\n");
  }

  if (analysis.isThirdPartyRequest) {
    const referredName = analysis.referredPersonName ?? translate("demoPlayground.personToContact");
    const referredBy = [
      analysis.referredByName ?? translate("common.unknown"),
      analysis.referredByContact,
    ].filter(Boolean).join(" · ");
    const personToContact = [
      analysis.referredPersonName ?? translate("common.unknown"),
      analysis.referredPersonPhone,
    ].filter(Boolean).join(" · ");
    const missingFields = analysis.missingFields.length
      ? analysis.missingFields.join(", ")
      : translate("demoPlayground.results.noMissingInfo");
    const actionText = analysis.contactActionType === "prepare_message_to_referred_person"
      ? translate("demoPlayground.actionPrepareMessageForPerson", { name: referredName })
      : translate("demoPlayground.askReasonBeforeSlots");
    const statusText = analysis.missingFields.length
      ? translate("demoPlayground.askReferredPersonReason", { name: referredName })
      : translate("demoPlayground.draftForReferredPerson", { name: referredName });

    return [
      translate("demoPlayground.requestFromAnotherPerson"),
      `${translate("demoPlayground.referredBy")}: ${referredBy}`,
      `${translate("demoPlayground.personToContact")}: ${personToContact}`,
      `${translate("demoPlayground.urgency")}: ${analysis.urgency === "urgent" ? translate("demoPlayground.urgent") : translate("demoPlayground.normalUrgency")}`,
      `${translate("demoPlayground.actionsLabel")}: ${actionText}`,
      analysis.missingFields.length ? `${translate("demoPlayground.referredPersonNeedsReason", { name: referredName })}: ${missingFields}` : null,
      statusText,
    ].filter(Boolean).join("\n");
  }

  if (analysis.hasMultipleRequests && analysis.appointmentRequests?.length) {
    return [
      translate("demoPlayground.multipleRequestsDetected"),
      ...analysis.appointmentRequests.map((request, index) => [
        translate("demoPlayground.appointmentNumber", { number: index + 1 }),
        `${translate("demoPlayground.when")}: ${request.requestedDateTimeText || translate("common.unknown")}`,
        `${translate("demoPlayground.appointmentReason")}: ${request.reason || translate("common.unknown")}`,
        `${translate("demoPlayground.proposedSlots")}: ${formatAppointmentRequestAlternatives(request.alternatives)}`,
      ].join("\n")),
    ].join("\n\n");
  }

  if (analysis.detectedIntent === "new_appointment" && analysis.urgency === "urgent") {
    const urgentSlots = alternatives || translate("demoPlayground.proposedUrgentSlots");

    return [
      translate("demoPlayground.urgentRequest"),
      `${translate("demoPlayground.appointmentReason")}: ${analysis.reason ?? translate("common.unknown")}`,
      `${translate("demoPlayground.proposedSlots")}: ${urgentSlots}`,
    ].join("\n");
  }

  if (analysis.detectedIntent === "delay_notice") {
    const appointment = analysis.matchedAppointment?.found
      ? ` ${translate("demoPlayground.appointmentFoundDetail", {
          customerName: analysis.matchedAppointment.customerName ?? translate("common.unknown"),
          startsAtText: analysis.matchedAppointment.startsAtText ?? translate("common.unknown"),
          reason: analysis.matchedAppointment.reason ?? translate("common.unknown"),
        })}`
      : "";

    return `${translate("demoPlayground.calendar.delayNearby")}${appointment}`;
  }

  if (analysis.detectedIntent === "reschedule_appointment" && analysis.matchedAppointment?.found) {
    const requestedMoveToText = analysis.proposedMoveToText ?? analysis.requestedNewDateText;

    return [
      translate("demoPlayground.demoAppointmentFound"),
      `${translate("demoPlayground.appointmentCustomer")}: ${analysis.matchedAppointment.customerName ?? translate("common.unknown")}`,
      `${translate("demoPlayground.appointmentCurrentTime")}: ${analysis.matchedAppointment.startsAtText ?? translate("common.unknown")}`,
      requestedMoveToText ? `${translate("demoPlayground.requestedNewDate")}: ${requestedMoveToText}` : null,
      `${translate("demoPlayground.appointmentReason")}: ${analysis.matchedAppointment.reason ?? translate("common.unknown")}`,
    ].filter(Boolean).join("\n");
  }

  if (analysis.detectedIntent === "appointment_lookup" && analysis.matchedAppointment?.found) {
    return [
      translate("demoPlayground.demoAppointmentFound"),
      `- ${translate("demoPlayground.appointmentCustomer")}: ${analysis.matchedAppointment.customerName ?? translate("common.unknown")}`,
      `- ${translate("demoPlayground.appointmentTime")}: ${analysis.matchedAppointment.startsAtText ?? translate("common.unknown")}`,
      `- ${translate("demoPlayground.appointmentReason")}: ${analysis.matchedAppointment.reason ?? translate("common.unknown")}`,
    ].join("\n");
  }

  if (analysis.matchedAppointment?.found) {
    return translate("demoPlayground.appointmentFoundDetail", {
      customerName: analysis.matchedAppointment.customerName ?? translate("common.unknown"),
      startsAtText: analysis.matchedAppointment.startsAtText ?? translate("common.unknown"),
      reason: analysis.matchedAppointment.reason ?? translate("common.unknown"),
    });
  }

  if (analysis.appointmentContextType === "new_appointment") {
    if (analysis.needsClarification) {
      return `${translate("demoPlayground.newAppointmentRequest")}. ${translate("demoPlayground.missingInformation")}: ${analysis.missingFields.join(", ") || translate("demoPlayground.appointmentReasonMissing")}`;
    }

    return `${translate("demoPlayground.newAppointmentRequest")}. ${translate("demoPlayground.recommendedNextStep")}: ${labelNextStep(analysis.recommendedNextStep, translate)}`;
  }

  if (analysis.needsClarification) {
    return `${translate("demoPlayground.noAppointmentFound")}. ${translate("demoPlayground.clarificationQuestion")}: ${analysis.clarificationQuestion ?? ""}`;
  }

  if (!analysis.needsCalendarCheck) {
    return translate("demoPlayground.calendar.noCalendarNeeded");
  }

  if (analysis.conflictDetected) {
    return `${translate("demoPlayground.results.calendarCheck")}: ${translate("demoPlayground.results.conflictDetected")}. ${translate("demoPlayground.calendar.conflict", {
      alternatives: alternatives || translate("demoPlayground.results.noAlternatives"),
    })}`;
  }

  if (analysis.alternatives.length > 0) {
    return `${translate("demoPlayground.results.calendarCheck")}: ${translate("demoPlayground.results.availableSlots")} ${translate("demoPlayground.calendar.available", {
      alternatives,
    })}`;
  }

  return translate("demoPlayground.calendar.needsReview");
}

function formatAppointmentRequestAlternatives(alternatives: string[]) {
  return alternatives
    .map((alternative) => alternative
      .replace(/^domani alle\s+/i, "")
      .replace(/^tomorrow at\s+/i, ""))
    .join(" / ");
}

function labelReadyReply(
  analysis: DemoCustomerRequestAnalysis,
  translate: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  if (analysis.isThirdPartyRequest) {
    return analysis.referredPersonName
      ? translate("demoPlayground.draftForPersonName", { name: analysis.referredPersonName })
      : translate("demoPlayground.draftForPersonToContact");
  }

  if (analysis.detectedIntent === "cancel_appointment") {
    return translate("demoPlayground.cancellationRequest");
  }

  if (analysis.requiresOperatorAttention) {
    return translate("demoPlayground.operatorAttention.draftTitle");
  }

  return translate("demoPlayground.results.readyReply");
}

function labelNextStep(
  step: DemoCustomerRequestAnalysis["recommendedNextStep"],
  translate: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  const keyByStep: Record<NonNullable<DemoCustomerRequestAnalysis["recommendedNextStep"]>, string> = {
    ask_clarification: "askClarification",
    propose_slots: "proposeSlots",
    propose_reschedule: "proposeReschedule",
    approve_reply: "approveReply",
    manual_review: "manualReview",
  };

  return step ? translate(`demoPlayground.nextSteps.${keyByStep[step]}`) : translate("common.review");
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function buildScreenshotSeed(locale: "it" | "en", t: (key: string) => string) {
  const seededText = t("demoPlayground.examples.quoteTomorrow");
  const seededAnalysis = analyzeDemoCustomerRequest({
    channel: "whatsapp",
    customerText: seededText,
    locale,
  });

  return {
    channel: "whatsapp" as DemoPlaygroundChannel,
    customerText: seededText,
    senderText: t("demoPlayground.senderPlaceholders.whatsapp"),
    analysis: seededAnalysis,
    editedReply: seededAnalysis.suggestedReply,
  };
}

function formatTime(value: string, locale: "it" | "en") {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
