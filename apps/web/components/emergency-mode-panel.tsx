"use client";

import type { EmergencyActionType, EmergencyMessageTone, EmergencyModeResult, EmergencyTargetWindow, SuggestedAction } from "@soreya/shared";
import { useState } from "react";

import { shouldUseWebDemoData } from "@/lib/demo-data";
import { addDemoSuggestedActions, buildDemoEmergencyResult } from "@/lib/demo-state";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type EmergencyForm = {
  type: EmergencyActionType;
  targetDate: string;
  reason: string;
  delayMinutes: number;
  messageTone: EmergencyMessageTone;
  targetWindow: EmergencyTargetWindow;
  customMessage: string;
};

const QUICK_ACTIONS: Array<{ type: EmergencyActionType; targetWindow: EmergencyTargetWindow }> = [
  { type: "reschedule_all_today", targetWindow: "all_day" },
  { type: "reschedule_morning", targetWindow: "morning" },
  { type: "reschedule_afternoon", targetWindow: "afternoon" },
  { type: "notify_delay", targetWindow: "all_day" },
  { type: "block_today", targetWindow: "all_day" },
  { type: "notify_all_today", targetWindow: "all_day" },
];

const initialForm: EmergencyForm = {
  type: "reschedule_all_today",
  targetDate: new Date().toISOString().slice(0, 10),
  reason: "",
  delayMinutes: 15,
  messageTone: "professional",
  targetWindow: "all_day",
  customMessage: "",
};

export function EmergencyModePanel() {
  const { locale, t, label } = useI18n();
  const [form, setForm] = useState<EmergencyForm>(() => ({ ...initialForm, reason: t("emergency.defaultReason") }));
  const [preview, setPreview] = useState<EmergencyModeResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const demoMode = shouldUseWebDemoData();

  async function submit(mode: "preview" | "create") {
    setIsBusy(true);
    setMessage(null);

    if (demoMode) {
      const result = buildDemoEmergencyResult(locale, form);
      const createdActions = result.suggestedActions.filter(isSuggestedAction);

      if (mode === "create") {
        addDemoSuggestedActions(locale, createdActions);
      }

      setPreview(result);
      setMessage(
        mode === "create"
          ? t("demo.localApprovalsCreated", { count: createdActions.length })
          : `${t("common.preview")}. ${t("demo.sandboxCopy")}`,
      );
      setIsBusy(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(data.session);

      const response = await fetch(`/api/emergency/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customMessage: form.customMessage || null,
        }),
      });
      const payload = (await response.json()) as EmergencyModeResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? `Emergency ${mode} failed.`);
      }

      setPreview(payload);
      setMessage(
        mode === "create"
          ? t("approvals.pendingCreated", { count: payload.suggestedActions.length })
          : t("common.previewReadyNoChanges"),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Emergency ${mode} failed.`);
    } finally {
      setIsBusy(false);
    }
  }

  function applyQuickAction(action: (typeof QUICK_ACTIONS)[number]) {
    setForm((current) => ({
      ...current,
      type: action.type,
      targetWindow: action.targetWindow,
      reason: label("emergencyActionTypes", action.type),
    }));
  }

  return (
    <div className="mt-5 space-y-5">
      <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        {t("emergency.noExternalExecution")} {t("safety.approvalFirst")}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50"
            key={action.type}
            onClick={() => applyQuickAction(action)}
            type="button"
          >
            {label("emergencyActionTypes", action.type)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-stone-700">
          {t("emergency.targetDate")}
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            onChange={(event) => setFormValue("targetDate", event.target.value, setForm)}
            type="date"
            value={form.targetDate}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          {t("emergency.messageTone")}
          <select
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            onChange={(event) => setFormValue("messageTone", event.target.value as EmergencyMessageTone, setForm)}
            value={form.messageTone}
          >
            <option value="professional">{t("emergency.tones.professional")}</option>
            <option value="friendly">{t("emergency.tones.friendly")}</option>
            <option value="short">{t("emergency.tones.short")}</option>
            <option value="apologetic">{t("emergency.tones.apologetic")}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-stone-700">
          {t("emergency.delayMinutes")}
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            min={0}
            onChange={(event) => setForm((current) => ({ ...current, delayMinutes: Number(event.target.value) }))}
            type="number"
            value={form.delayMinutes}
          />
        </label>
        <label className="text-sm font-medium text-stone-700">
          {t("emergency.reason")}
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            onChange={(event) => setFormValue("reason", event.target.value, setForm)}
            value={form.reason}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-stone-700">
        {t("emergency.customMessage")}
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-stone-300 px-3 py-2"
          onChange={(event) => setFormValue("customMessage", event.target.value, setForm)}
          value={form.customMessage}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
          disabled={isBusy}
          onClick={() => submit("preview")}
          type="button"
        >
          {t("emergency.previewPlan")}
        </button>
        <button
          className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isBusy}
          onClick={() => submit("create")}
          type="button"
        >
          {t("emergency.createPendingApprovals")}
        </button>
        <a className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700" href="#approvals">
          {t("navigation.approvals")}
        </a>
      </div>

      {message ? <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}

      {preview ? (
        <div className="space-y-4 border-t border-stone-200 pt-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label={t("emergency.affectedEvents")} value={preview.affectedEvents.length} />
            <Metric label={t("emergency.proposals")} value={preview.proposals.length} />
            <Metric label={t("emergency.suggestedActions")} value={preview.suggestedActions.length} />
          </div>

          {preview.warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">{t("emergency.warnings")}</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : null}

          {preview.affectedEvents.length ? (
            <div className="rounded-md border border-stone-200 bg-white">
              <p className="border-b border-stone-200 px-3 py-2 text-sm font-medium text-stone-950">
                {t("emergency.affectedEvents")}
              </p>
              <div className="divide-y divide-stone-200">
                {preview.affectedEvents.slice(0, 6).map((event) => (
                  <div className="px-3 py-2" key={event.id}>
                    <p className="text-sm font-medium text-stone-950">{event.title}</p>
                    <p className="mt-1 text-xs text-stone-500">{formatDateTime(event.startsAt, locale)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="divide-y divide-stone-200 border-t border-stone-200">
            {preview.proposals.slice(0, 6).map((proposal) => (
              <div className="py-4" key={`${proposal.calendarEventId}-${proposal.originalStartsAt}`}>
                <p className="text-sm font-medium text-stone-950">{proposal.recipientName ?? proposal.recipientEmail ?? proposal.recipientPhone ?? t("emergency.manualReview")}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {formatDateTime(proposal.originalStartsAt, locale)} · {proposal.preferredChannel}
                </p>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-stone-50 p-3 text-sm text-stone-700">{proposal.messageBody}</pre>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function setFormValue<K extends keyof EmergencyForm>(
  key: K,
  value: EmergencyForm[K],
  setForm: (updater: (current: EmergencyForm) => EmergencyForm) => void,
) {
  setForm((current) => ({ ...current, [key]: value }));
}

function isSuggestedAction(action: EmergencyModeResult["suggestedActions"][number]): action is SuggestedAction {
  return "action_type" in action;
}

function formatDateTime(value: string, locale: "it" | "en") {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
