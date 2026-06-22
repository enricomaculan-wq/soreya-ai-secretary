"use client";

import type { Json, QuickCallNote, QuickCallResult, SuggestedAction } from "@soreya/shared";
import { useCallback, useEffect, useState } from "react";

import { shouldUseWebDemoData } from "@/lib/demo-data";
import {
  addDemoQuickCallNote,
  addDemoSuggestedActions,
  buildDemoQuickCallResult,
  useDemoQuickCallNotes,
} from "@/lib/demo-state";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type NotesResponse = {
  notes?: QuickCallNote[];
  error?: string;
};

type QuickCallResponse = QuickCallResult & {
  error?: string;
};

type PreviewAnalysisView = {
  intentType: string;
  confidence?: number;
  customerName?: string;
  requestedDateTimeText?: string;
  reason?: string;
  missingFields?: string[];
  aiProvider?: string;
  usedFallback?: boolean;
  safetyNotes?: string[];
};

export function QuickCallNotePanel() {
  const { locale, t, label } = useI18n();
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<QuickCallResult | null>(null);
  const [notes, setNotes] = useState<QuickCallNote[]>([]);
  const [demoNotes, setDemoNotes] = useDemoQuickCallNotes(locale);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const demoMode = shouldUseWebDemoData();
  const visibleNotes = demoMode ? demoNotes : notes;

  const loadNotes = useCallback(async () => {
    if (demoMode) {
      setMessage(t("demo.sandboxCopy"));
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setNotes([]);
      return;
    }

    try {
      await syncCurrentSession();
      const response = await fetch("/api/quick-call/list?limit=6");
      const payload = (await response.json()) as NotesResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load call notes.");
      }

      setNotes(payload.notes ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load call notes.");
    }
  }, [demoMode, t]);

  useEffect(() => {
    void Promise.resolve().then(loadNotes);
  }, [loadNotes]);

  async function submit(mode: "analyze" | "create") {
    setIsBusy(true);
    setMessage(null);

    if (demoMode) {
      const result = buildDemoQuickCallResult(locale, rawText);

      setPreview(result);
      if (mode === "create" && result.callNote) {
        addDemoQuickCallNote(locale, result.callNote);
        addDemoSuggestedActions(locale, result.suggestedActions.filter(isSuggestedAction));
        setDemoNotes((current) => [result.callNote as QuickCallNote, ...current.filter((note) => note.id !== result.callNote?.id)]);
      }
      setMessage(
        mode === "create"
          ? t("demo.localApprovalsCreated", { count: result.suggestedActions.length })
          : t("quickCall.previewReady"),
      );
      setIsBusy(false);
      return;
    }

    try {
      await syncCurrentSession();
      const response = await fetch(`/api/quick-call/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const payload = (await response.json()) as QuickCallResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? `Quick Call ${mode} failed.`);
      }

      setPreview(payload);
      setMessage(
        mode === "create"
          ? t("approvals.pendingCreated", { count: payload.suggestedActions.length })
          : t("common.previewReadyNoChanges"),
      );

      if (mode === "create") {
        await loadNotes();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Quick Call ${mode} failed.`);
    } finally {
      setIsBusy(false);
    }
  }

  async function ignore(callNoteId: string) {
    setMessage(null);

    if (demoMode) {
      setDemoNotes((current) => current.filter((note) => note.id !== callNoteId));
      setMessage(t("approvals.demoIgnored"));
      return;
    }

    try {
      await syncCurrentSession();
      const response = await fetch("/api/quick-call/ignore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callNoteId }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to ignore call note.");
      }

      await loadNotes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to ignore call note.");
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <p className="rounded-md border border-[var(--trust-border)] bg-[var(--trust-soft)] p-3 text-sm text-[var(--trust)]">
        {t("quickCall.title")}: {t("safety.approvalFirst")}
      </p>

      <label className="block text-sm font-medium text-stone-700">
        {t("quickCall.whatCallerAsked")}
        <textarea
          className="mt-2 min-h-36 w-full rounded-md border border-stone-300 bg-white p-3 text-sm leading-6 text-stone-950 outline-none focus:border-stone-500"
          onChange={(event) => {
            setRawText(event.target.value);
            setPreview(null);
          }}
          placeholder={t("quickCall.placeholder")}
          value={rawText}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:bg-stone-100"
          disabled={isBusy || rawText.trim().length < 3}
          onClick={() => submit("analyze")}
          type="button"
        >
          {t("quickCall.analyze")}
        </button>
        <button
          className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400"
          disabled={isBusy || rawText.trim().length < 3}
          onClick={() => submit("create")}
          type="button"
        >
          {t("quickCall.createPendingApprovals")}
        </button>
        <a className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700" href="#approvals">
          {t("navigation.approvals")}
        </a>
      </div>

      {message ? <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}

      {preview ? <QuickCallPreview result={preview} /> : null}

      <div className="border-t border-stone-200 pt-4">
        <h3 className="text-base font-semibold tracking-normal text-stone-950">{t("quickCall.latestNotes")}</h3>
        <div className="mt-3 divide-y divide-stone-200">
          {visibleNotes.length ? (
            visibleNotes.map((note) => (
              <div className="py-3" key={note.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-950">{note.customerName ?? label("quickCallIntentTypes", note.intentType)}</p>
                    <p className="mt-1 text-sm text-stone-500">{note.rawText}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {label("approvalStatus", note.status)} · {formatDateTime(note.createdAt, locale)}
                    </p>
                  </div>
                  <button
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                    onClick={() => ignore(note.id)}
                    type="button"
                  >
                    {t("common.ignore")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-3 text-sm text-stone-500">{t("quickCall.noNotes")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCallPreview({ result }: { result: QuickCallResult }) {
  const { locale, t, label } = useI18n();
  const analysis = readAnalysis(result);
  const intentLabel = analysis.intentType === "preview"
    ? t("common.preview")
    : label("quickCallIntentTypes", analysis.intentType ?? "unknown") || t("common.unknown");
  const draftBody = result.suggestedActions
    .map((action) => readDraftPayload(action)?.body)
    .find((body): body is string => typeof body === "string");

  return (
    <div className="space-y-4 border-t border-stone-200 pt-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label={t("quickCall.intent")} value={intentLabel} />
        <Metric label={t("quickCall.confidence")} value={analysis.confidence ? `${Math.round(analysis.confidence * 100)}%` : "0%"} />
        <Metric label={t("quickCall.ai")} value={analysis.usedFallback === false ? t("quickCall.aiAnalyzed") : t("quickCall.aiFallback")} />
        <Metric label={t("emergency.suggestedActions")} value={String(result.suggestedActions.length)} />
      </div>

      <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
        <p className="text-sm font-medium text-stone-950">{analysis.customerName ?? t("quickCall.noCustomer")}</p>
        <p className="mt-1 text-sm text-stone-500">
          {analysis.requestedDateTimeText ?? t("quickCall.noRequestedTime")} · {analysis.reason ?? t("quickCall.noReason")}
        </p>
        {analysis.missingFields?.length ? (
          <p className="mt-2 text-sm text-amber-700">{t("quickCall.missingFields")}: {analysis.missingFields.join(", ")}</p>
        ) : null}
      </div>

      {result.alternatives.length ? (
        <div className="rounded-md border border-stone-200 bg-white">
          <p className="border-b border-stone-200 px-3 py-2 text-sm font-medium text-stone-950">{t("calendar.alternativeSlots")}</p>
          {result.alternatives.slice(0, 3).map((slot) => (
            <p className="border-b border-stone-100 px-3 py-2 text-sm text-stone-600 last:border-b-0" key={slot.startsAt}>
              {formatDateTime(slot.startsAt, locale)}
            </p>
          ))}
        </div>
      ) : null}

      {draftBody ? (
        <pre className="whitespace-pre-wrap rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
          {draftBody}
        </pre>
      ) : null}

      {result.warnings.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">{t("emergency.warnings")}</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      {analysis.safetyNotes?.length ? (
        <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
          <p className="text-sm font-medium text-stone-900">{t("quickCall.safetyNotes")}</p>
          <ul className="mt-2 space-y-1 text-sm text-stone-600">
            {analysis.safetyNotes.slice(0, 3).map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function readAnalysis(result: QuickCallResult): PreviewAnalysisView {
  const noteAnalysis = result.callNote?.analysis;

  if (noteAnalysis && typeof noteAnalysis === "object" && !Array.isArray(noteAnalysis)) {
    const record = noteAnalysis as Record<string, Json | undefined>;

    return {
      intentType: typeof record.intentType === "string" ? record.intentType : "unknown",
      confidence: typeof record.confidence === "number" ? record.confidence : undefined,
      customerName: typeof record.customerName === "string" ? record.customerName : undefined,
      requestedDateTimeText: typeof record.requestedDateTimeText === "string" ? record.requestedDateTimeText : undefined,
      reason: typeof record.reason === "string" ? record.reason : undefined,
      missingFields: Array.isArray(record.missingFields)
        ? record.missingFields.filter((field): field is string => typeof field === "string")
        : undefined,
      aiProvider: typeof record.aiProvider === "string" ? record.aiProvider : undefined,
      usedFallback: typeof record.usedFallback === "boolean" ? record.usedFallback : undefined,
      safetyNotes: Array.isArray(record.safetyNotes)
        ? record.safetyNotes.filter((note): note is string => typeof note === "string")
        : undefined,
    };
  }

  const firstPayload = readDraftPayload(result.suggestedActions[0]);

  return {
    intentType: "preview",
    confidence: undefined,
    customerName: readString(firstPayload?.customerName),
    requestedDateTimeText: readString(firstPayload?.requestedDateTimeText),
    reason: readString(firstPayload?.reason),
    missingFields: Array.isArray(firstPayload?.missingFields)
      ? firstPayload.missingFields.filter((field): field is string => typeof field === "string")
      : undefined,
    aiProvider: readString(firstPayload?.aiProvider),
    usedFallback: typeof firstPayload?.usedFallback === "boolean" ? firstPayload.usedFallback : undefined,
    safetyNotes: Array.isArray(firstPayload?.safetyNotes)
      ? firstPayload.safetyNotes.filter((note): note is string => typeof note === "string")
      : undefined,
  };
}

function readDraftPayload(action: QuickCallResult["suggestedActions"][number] | undefined): Record<string, Json | undefined> | null {
  if (!action) {
    return null;
  }

  const payload = "draftPayload" in action ? action.draftPayload : action.draft_payload;
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
}

function readString(value: Json | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isSuggestedAction(action: QuickCallResult["suggestedActions"][number]): action is SuggestedAction {
  return "action_type" in action;
}

async function syncCurrentSession() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  await syncSupabaseSessionToServer(data.session);
}

function formatDateTime(value: string, locale: "it" | "en") {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
