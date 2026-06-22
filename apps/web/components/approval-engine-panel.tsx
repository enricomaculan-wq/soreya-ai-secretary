"use client";

import type { ExecutionPreview, ExecutionRecord, ExecutionType, Json, SuggestedAction } from "@soreya/shared";
import { useCallback, useEffect, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useDemoSuggestedActions } from "@/lib/demo-state";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type ApprovalListResponse = {
  actions?: SuggestedAction[];
  error?: string;
};

type ApprovalMutationResponse = {
  action?: SuggestedAction;
  error?: string;
};

type ExecutionPreviewResponse = {
  preview?: ExecutionPreview;
  blocked?: boolean;
  error?: string;
};

type ExecutionResultResponse = {
  action?: SuggestedAction;
  preview?: ExecutionPreview;
  record?: ExecutionRecord;
  status?: string;
  dryRun?: boolean;
  message?: string;
  error?: string;
};

type EditingState = {
  actionId: string;
  value: string;
  mode: "body" | "payload";
};

export function ApprovalEnginePanel({ marketing = false }: { marketing?: boolean }) {
  const { locale, t, label } = useI18n();
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [demoActions, setDemoActions] = useDemoSuggestedActions(locale);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [executionPreviews, setExecutionPreviews] = useState<Record<string, ExecutionPreview>>({});
  const [executionResults, setExecutionResults] = useState<Record<string, ExecutionResultResponse>>({});
  const [confirmationTexts, setConfirmationTexts] = useState<Record<string, string>>({});
  const demoMode = shouldUseWebDemoData();
  const visibleActions = demoMode ? demoActions : actions;

  const loadActions = useCallback(async () => {
    setMessage(null);

    if (demoMode) {
      if (!marketing) {
        setMessage(t("demo.sandboxCopy"));
      }
      setIsLoading(false);
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setActions([]);
      setMessage("Supabase is not configured. Approval queue is unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(data.session);
      const response = await fetch("/api/approvals/list?limit=50");
      const payload = (await response.json()) as ApprovalListResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load approval queue.");
      }

      setActions(payload.actions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load approval queue.");
    } finally {
      setIsLoading(false);
    }
  }, [demoMode, marketing, t]);

  useEffect(() => {
    void Promise.resolve().then(loadActions);
  }, [loadActions]);

  async function runDecision(action: SuggestedAction, decision: "approve" | "reject" | "ignore") {
    setBusyActionId(action.id);
    setMessage(null);

    if (demoMode) {
      if (decision === "approve") {
        setDemoActions((current) =>
          current.map((item) =>
            item.id === action.id
              ? {
                  ...item,
                  status: "approved",
                  approved_by: getWebDemoData(locale).membership.user_id,
                  approved_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
        );
        setMessage(t("approvals.demoApproved"));
      } else {
        setDemoActions((current) =>
          current.map((item) =>
            item.id === action.id
              ? {
                  ...item,
                  status: decision === "reject" ? "rejected" : "ignored",
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
        );
        setMessage(decision === "reject" ? t("approvals.demoRejected") : t("approvals.demoIgnored"));
      }
      setBusyActionId(null);
      return;
    }

    try {
      const response = await fetch(`/api/approvals/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestedActionId: action.id,
          note: `${decision} from web approval queue`,
        }),
      });
      const payload = (await response.json()) as ApprovalMutationResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? `Unable to ${decision} action.`);
      }

      if (decision === "approve") {
        setActions((current) => current.map((item) => (item.id === action.id && payload.action ? payload.action : item)));
        setMessage("Approved, ready for execution. No external action was performed.");
      } else {
        setActions((current) => current.filter((item) => item.id !== action.id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${decision} action.`);
    } finally {
      setBusyActionId(null);
    }
  }

  async function saveEdit(action: SuggestedAction) {
    if (!editing || editing.actionId !== action.id) {
      return;
    }

    setBusyActionId(action.id);
    setMessage(null);

    if (demoMode) {
      try {
        const draftPayload = buildEditedPayload(action, editing);
        setDemoActions((current) =>
          current.map((item) =>
            item.id === action.id
              ? { ...item, status: "edited", draft_payload: draftPayload, updated_at: new Date().toISOString() }
              : item,
          ),
        );
        setEditing(null);
        setMessage(t("approvals.draftSaved"));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to edit demo action.");
      } finally {
        setBusyActionId(null);
      }
      return;
    }

    try {
      const draftPayload = buildEditedPayload(action, editing);
      const response = await fetch("/api/approvals/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestedActionId: action.id,
          draftPayload,
          note: "Draft payload edited from web approval queue",
        }),
      });
      const payload = (await response.json()) as ApprovalMutationResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to edit action.");
      }

      setActions((current) => current.map((item) => (item.id === action.id && payload.action ? payload.action : item)));
      setEditing(null);
      setMessage(t("approvals.draftSaved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to edit action.");
    } finally {
      setBusyActionId(null);
    }
  }

  async function previewExecution(action: SuggestedAction) {
    setBusyActionId(action.id);
    setMessage(null);

    if (demoMode) {
      const preview = buildDemoExecutionPreview(action, [
        t("demo.sandboxCopy"),
        t("safety.approvalIsNotExecution"),
      ], t("approvals.noRecipient"));
      setExecutionPreviews((current) => ({ ...current, [action.id]: preview }));
      setMessage(t("approvals.previewReady"));
      setBusyActionId(null);
      return;
    }

    try {
      const response = await fetch("/api/execution/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedActionId: action.id }),
      });
      const payload = (await response.json()) as ExecutionPreviewResponse;

      if (!response.ok || !payload.preview) {
        throw new Error(payload.error ?? "Unable to build execution preview.");
      }

      setExecutionPreviews((current) => ({ ...current, [action.id]: payload.preview as ExecutionPreview }));
      setMessage(payload.preview.canExecute ? t("approvals.previewReady") : t("approvals.previewBlocked"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to build execution preview.");
    } finally {
      setBusyActionId(null);
    }
  }

  async function executeFinal(action: SuggestedAction) {
    setBusyActionId(action.id);
    setMessage(null);

    if (demoMode) {
      const confirmed = (confirmationTexts[action.id] ?? "") === "EXECUTE";
      const preview = buildDemoExecutionPreview(action, [
        t("demo.sandboxCopy"),
        t("safety.approvalIsNotExecution"),
      ], t("approvals.noRecipient"));
      const payload: ExecutionResultResponse = {
        action,
        preview,
        status: confirmed ? "dry_run" : "blocked",
        dryRun: true,
        message: confirmed
          ? t("approvals.dryRunComplete")
          : t("common.typeExecute"),
      };

      setExecutionPreviews((current) => ({ ...current, [action.id]: preview }));
      setExecutionResults((current) => ({ ...current, [action.id]: payload }));
      setMessage(payload.message ?? null);
      setBusyActionId(null);
      return;
    }

    try {
      const response = await fetch("/api/execution/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestedActionId: action.id,
          finalConfirmationText: confirmationTexts[action.id] ?? "",
        }),
      });
      const payload = (await response.json()) as ExecutionResultResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to execute action.");
      }

      if (payload.action) {
        setActions((current) => current.map((item) => (item.id === action.id ? payload.action as SuggestedAction : item)));
      }

      if (payload.preview) {
        setExecutionPreviews((current) => ({ ...current, [action.id]: payload.preview as ExecutionPreview }));
      }

      setExecutionResults((current) => ({ ...current, [action.id]: payload }));
      setMessage(payload.message ?? "Execution result received.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to execute action.");
    } finally {
      setBusyActionId(null);
    }
  }

  if (isLoading) {
    return <EmptyState title={`${t("common.loading")} ${t("approvals.queue").toLowerCase()}`} detail="suggested_actions" />;
  }

  if (message && visibleActions.length === 0) {
    return <EmptyState title={t("common.unavailable")} detail={message} />;
  }

  if (visibleActions.length === 0) {
    return (
      <EmptyState
        detail={t("approvals.noPendingDetail")}
        title={t("approvals.noPending")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="soreya-engine-note">
        {t("safety.approvalFirst")}
      </p>
      {!marketing ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t("safety.approvalIsNotExecution")} {t("safety.dryRunExecution")}
        </p>
      ) : null}
      {message && !marketing ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
      ) : null}

      {visibleActions.map((action) => {
        const draft = readDraftPayload(action);
        const isEditing = editing?.actionId === action.id;
        const busy = busyActionId === action.id;
        const executionPreview = executionPreviews[action.id];
        const executionResult = executionResults[action.id];
        const canReview = action.status === "pending_approval" || action.status === "edited";

        return (
          <article key={action.id} className="soreya-approval-item">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={action.status === "approved" ? "green" : action.status === "edited" ? "amber" : "neutral"}>
                    {action.status === "approved" ? t("approvals.approvedReady") : label("approvalStatus", action.status)}
                  </StatusPill>
                  <StatusPill>{getActionOrigin(action, t)}</StatusPill>
                </div>
                <h3 className="mt-3 text-base font-semibold tracking-normal text-stone-950">{action.title}</h3>
                <p className="mt-1 text-sm text-stone-500">
                  {label("actionTypes", action.action_type)} · {readRecipient(draft, t("approvals.noRecipient"))} · {formatDateTime(action.created_at, locale)}
                </p>
                {action.rationale ? <p className="mt-2 text-sm leading-6 text-stone-600">{action.rationale}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                  disabled={busy || !canReview}
                  onClick={() => runDecision(action, "approve")}
                  type="button"
                >
                  {t("common.approve")}
                </button>
                <button
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:bg-stone-100"
                  disabled={busy || !canReview}
                  onClick={() => setEditing(createEditingState(action))}
                  type="button"
                >
                  {t("common.edit")}
                </button>
                <button
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:bg-stone-100"
                  disabled={busy || !canReview}
                  onClick={() => runDecision(action, "reject")}
                  type="button"
                >
                  {t("common.reject")}
                </button>
                <button
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:bg-stone-100"
                  disabled={busy || !canReview}
                  onClick={() => runDecision(action, "ignore")}
                  type="button"
                >
                  {t("common.ignore")}
                </button>
              </div>
            </div>

            {draft.body ? (
              <pre className="mt-4 whitespace-pre-wrap rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                {draft.body}
              </pre>
            ) : null}

            {!marketing ? (
              <details className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-stone-800">{t("common.payload")}</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-stone-600">
                  {JSON.stringify(action.draft_payload, null, 2)}
                </pre>
              </details>
            ) : null}

            {isEditing ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
                <label className="text-sm font-medium text-stone-900">
                  {editing.mode === "body" ? t("common.draft") : t("common.payload")}
                  <textarea
                    className="mt-2 min-h-40 w-full rounded-md border border-stone-300 bg-white p-3 font-mono text-sm text-stone-950 outline-none focus:border-stone-500"
                    onChange={(event) => setEditing({ ...editing, value: event.target.value })}
                    value={editing.value}
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                    disabled={busy}
                    onClick={() => saveEdit(action)}
                    type="button"
                  >
                    {t("common.save")}
                  </button>
                  <button
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                    onClick={() => setEditing(null)}
                    type="button"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : null}

            {action.status === "approved" && !marketing ? (
              <div className="mt-4 rounded-md border border-[var(--trust-border)] bg-[var(--trust-soft)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-950">{label("approvalStatus", "approved")}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--trust)]">
                      {t("safety.dryRunExecution")}
                    </p>
                  </div>
                  <button
                    className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-[var(--trust)] disabled:cursor-not-allowed disabled:bg-emerald-100"
                    disabled={busy}
                    onClick={() => previewExecution(action)}
                    type="button"
                  >
                    {t("common.preview")}
                  </button>
                </div>

                {executionPreview ? (
                  <div className="mt-4 rounded-md border border-[var(--trust-border)] bg-white p-3">
                    <p className="text-sm font-medium text-stone-950">
                      {executionPreview.executionType} · {executionPreview.provider ?? t("common.providerPending")}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {executionPreview.recipient ?? t("approvals.noRecipient")} · {executionPreview.dryRun ? "dry_run" : t("common.realModeRequested")}
                    </p>
                    {executionPreview.body ? (
                      <pre className="mt-3 whitespace-pre-wrap rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                        {executionPreview.body}
                      </pre>
                    ) : null}
                    {executionPreview.warnings.length > 0 ? (
                      <ul className="mt-3 space-y-1 text-sm text-amber-800">
                        {executionPreview.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <label className="mt-4 block text-sm font-medium text-stone-900">
                  {t("common.typeExecute")}
                  <input
                    className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-950 outline-none focus:border-stone-500"
                    onChange={(event) =>
                      setConfirmationTexts((current) => ({ ...current, [action.id]: event.target.value }))
                    }
                    placeholder="EXECUTE"
                    value={confirmationTexts[action.id] ?? ""}
                  />
                </label>
                <button
                  className="mt-3 rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                  disabled={busy}
                  onClick={() => executeFinal(action)}
                  type="button"
                >
                  {t("common.execute")}
                </button>

                {executionResult ? (
                  <p className="mt-3 rounded-md border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-700">
                    {t("common.result")}: {executionResult.status ?? t("common.unknown")} ·{" "}
                    {executionResult.dryRun ? "dry_run" : t("common.realModeRequested")} ·{" "}
                    {executionResult.message ?? executionResult.record?.errorMessage ?? t("common.noItems")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function createEditingState(action: SuggestedAction): EditingState {
  const draft = readDraftPayload(action);

  if (draft.body) {
    return {
      actionId: action.id,
      mode: "body",
      value: draft.body,
    };
  }

  return {
    actionId: action.id,
    mode: "payload",
    value: JSON.stringify(action.draft_payload, null, 2),
  };
}

function buildEditedPayload(action: SuggestedAction, editing: EditingState): Json {
  if (editing.mode === "payload") {
    return JSON.parse(editing.value) as Json;
  }

  const draft = toJsonObject(action.draft_payload);

  return {
    ...draft,
    body: editing.value,
  };
}

function readDraftPayload(action: SuggestedAction): {
  body?: string;
  recipient?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  to?: string;
} {
  const draft = toJsonObject(action.draft_payload);

  return {
    body: typeof draft.body === "string" ? draft.body : undefined,
    recipient: typeof draft.recipient === "string" ? draft.recipient : undefined,
    recipientEmail: typeof draft.recipientEmail === "string" ? draft.recipientEmail : undefined,
    recipientPhone: typeof draft.recipientPhone === "string" ? draft.recipientPhone : undefined,
    to: typeof draft.to === "string" ? draft.to : undefined,
  };
}

function readRecipient(draft: ReturnType<typeof readDraftPayload>, fallback = "No recipient") {
  return draft.recipientPhone ?? draft.recipientEmail ?? draft.recipient ?? draft.to ?? fallback;
}

function getActionOrigin(
  action: SuggestedAction,
  translate: (key: string) => string,
) {
  const draft = toJsonObject(action.draft_payload);
  const provider = typeof draft.provider === "string" ? draft.provider : "";

  if (action.action_type.includes("whatsapp") || provider.includes("whatsapp")) {
    return "WhatsApp";
  }

  if (action.action_type.includes("calendar") || provider === "google" || provider === "microsoft_calendar") {
    return translate("calendar.title");
  }

  if (action.action_type.includes("email") || ["gmail", "microsoft"].includes(provider)) {
    return "Email";
  }

  if (action.action_type.includes("_from_call") || action.action_type.includes("call_") || provider === "quick_call") {
    return translate("quickCall.title");
  }

  return "Soreya";
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function buildDemoExecutionPreview(action: SuggestedAction, warnings: string[], noRecipientLabel: string): ExecutionPreview {
  const draft = readDraftPayload(action);
  const draftPayload = toJsonObject(action.draft_payload);

  return {
    suggestedActionId: action.id,
    executionType: mapActionToExecutionType(action),
    provider: "demo",
    recipient: readRecipient(draft, noRecipientLabel),
    subject: typeof draftPayload.subject === "string" ? draftPayload.subject : null,
    body: draft.body ?? null,
    calendarChange: null,
    warnings,
    dryRun: true,
    canExecute: action.status === "approved",
  };
}

function mapActionToExecutionType(action: SuggestedAction): ExecutionType {
  if (action.action_type.includes("whatsapp")) {
    return action.action_type.includes("emergency") || action.action_type.includes("delay")
      ? "emergency_whatsapp"
      : "whatsapp_reply";
  }

  if (action.action_type.includes("calendar") || action.action_type === "callback_reminder") {
    return action.action_type.includes("update")
      ? "calendar_update"
      : action.action_type.includes("cancel") || action.action_type.includes("delete")
        ? "calendar_cancel"
        : "calendar_create";
  }

  if (action.action_type.includes("emergency") || action.action_type.includes("delay")) {
    return "emergency_email";
  }

  return "email_reply";
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-5 border-t border-stone-200 py-5">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{detail}</p>
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "green" | "amber" }) {
  const toneClass =
    tone === "green"
      ? "border-[var(--trust-border)] bg-[var(--trust-soft)] text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-stone-200 bg-stone-50 text-stone-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

function formatDateTime(value: string, locale: "it" | "en") {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
