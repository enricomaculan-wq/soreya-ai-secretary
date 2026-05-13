"use client";

import {
  buildDemoApprovalFromRequest,
  type ApprovalState,
  type DemoCustomerRequestAnalysis,
  type DemoDetectedIntent,
  type DemoPlaygroundChannel,
  type Json,
  type SuggestedAction,
} from "@soreya/shared";
import { useState } from "react";

import { getWebDemoData } from "@/lib/demo-data";
import { useDemoSuggestedActions } from "@/lib/demo-state";
import { useI18n } from "@/lib/i18n";

type DemoPlaygroundPanelProps = {
  compact?: boolean;
};

type DemoActionStatus = Extract<ApprovalState, "pending_approval" | "approved" | "edited" | "ignored">;

const channels: DemoPlaygroundChannel[] = ["email", "whatsapp", "quick_call"];

export function DemoPlaygroundPanel({ compact = false }: DemoPlaygroundPanelProps) {
  const { locale, t } = useI18n();
  const [, setDemoActions] = useDemoSuggestedActions(locale);
  const [channel, setChannel] = useState<DemoPlaygroundChannel>("email");
  const [senderText, setSenderText] = useState("");
  const [customerText, setCustomerText] = useState("");
  const [analysis, setAnalysis] = useState<DemoCustomerRequestAnalysis | null>(null);
  const [editedReply, setEditedReply] = useState("");
  const [draftActionId, setDraftActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function runAnalysis() {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/demo/analyze-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          senderText,
          customerText,
          locale,
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("common.unavailable"));
    } finally {
      setIsAnalyzing(false);
    }
  }

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
  }

  function handleEdit() {
    upsertDemoAction("edited");
  }

  function handleIgnore() {
    upsertDemoAction("ignored");
  }

  return (
    <section className={`rounded-lg border border-stone-200 bg-white shadow-sm ${compact ? "p-5" : "p-6"}`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <p className="text-sm font-semibold text-stone-950">{t("demoPlayground.channel")}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {channels.map((item) => (
              <button
                className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${
                  channel === item
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
                key={item}
                onClick={() => setChannel(item)}
                type="button"
              >
                {t(`demoPlayground.channels.${item === "quick_call" ? "quickCall" : item}`)}
              </button>
            ))}
          </div>

          <label className="mt-5 block text-sm font-semibold text-stone-950">
            {t("demoPlayground.sender")}
            <input
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none focus:border-stone-500"
              onChange={(event) => {
                setSenderText(event.target.value);
                setError(null);
              }}
              placeholder={t(`demoPlayground.senderPlaceholders.${channel === "quick_call" ? "quickCall" : channel}`)}
              value={senderText}
            />
          </label>

          <label className="mt-5 block text-sm font-semibold text-stone-950">
            {t("demoPlayground.customerRequest")}
            <textarea
              className={`${compact ? "min-h-36" : "min-h-52"} mt-2 w-full rounded-md border border-stone-300 bg-white p-4 text-base leading-7 text-stone-950 outline-none focus:border-stone-500`}
              onChange={(event) => {
                setCustomerText(event.target.value);
                setError(null);
              }}
              placeholder={t("demoPlayground.placeholder")}
              value={customerText}
            />
          </label>

          <button
            className="mt-5 w-full rounded-md bg-stone-950 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-stone-800 sm:w-auto"
            disabled={isAnalyzing}
            onClick={runAnalysis}
            type="button"
          >
            {isAnalyzing ? t("demoPlayground.analyzing") : t("demoPlayground.analyzeButton")}
          </button>

          <p className="mt-3 text-xs leading-5 text-stone-500">{t("demoPlayground.safeDemoShort")}</p>

          {error ? (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-900">
              {error}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-lg font-semibold tracking-normal text-stone-950">{t("demoPlayground.results.title")}</h2>
          {analysis ? (
            <div className="mt-4 space-y-4">
              <SimpleBlock
                label={t("demoPlayground.results.sender")}
                value={buildSenderSummary(analysis, t)}
              />
              <SimpleBlock
                label={t("demoPlayground.results.understood")}
                value={buildUnderstandingSummary(analysis, t)}
              />
              <SimpleBlock
                label={analysis.detectedIntent === "cancel_appointment"
                  ? t("demoPlayground.linkedAppointments")
                  : analysis.isThirdPartyRequest
                  ? t("demoPlayground.thirdPartyRequest")
                  : analysis.hasMultipleRequests
                    ? t("demoPlayground.detectedRequests")
                    : analysis.detectedIntent === "appointment_lookup"
                      ? t("demoPlayground.linkedAppointment")
                    : t("demoPlayground.results.linkedAppointment")}
                value={buildAppointmentContextSummary(analysis, locale, t)}
              />
              <div>
                <p className="text-sm font-semibold text-stone-950">{labelReadyReply(analysis, t)}</p>
                <textarea
                  className="mt-2 min-h-40 w-full rounded-md border border-stone-300 bg-white p-3 text-sm leading-6 text-stone-950 outline-none focus:border-stone-500"
                  onChange={(event) => setEditedReply(event.target.value)}
                  value={editedReply}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-950">{t("demoPlayground.results.actions")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
                    onClick={handleApprove}
                    type="button"
                  >
                    {t("demoPlayground.actions.approveResponse")}
                  </button>
                  <button
                    className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                    onClick={handleEdit}
                    type="button"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                    onClick={handleIgnore}
                    type="button"
                  >
                    {t("common.ignore")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-stone-600">{t("demoPlayground.results.empty")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function SimpleBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-sm font-semibold text-stone-950">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-stone-700">{value}</p>
    </div>
  );
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
    callback_request: "demoPlayground.summary.callback",
    manual_review: "demoPlayground.summary.manualReview",
  };

  return translate(summaryKeyByIntent[analysis.detectedIntent], { requestedTime });
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
    return [
      translate("demoPlayground.urgentRequest"),
      `${translate("demoPlayground.appointmentReason")}: ${analysis.reason ?? translate("common.unknown")}`,
      `${translate("demoPlayground.proposedSlots")}: ${translate("demoPlayground.proposedUrgentSlots")}`,
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

function formatTime(value: string, locale: "it" | "en") {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
