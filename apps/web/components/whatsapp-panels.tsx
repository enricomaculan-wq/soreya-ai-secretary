"use client";

import {
  getCachedWhatsAppMessages,
  getCurrentUser,
  getUserOrganization,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type { NormalizedWhatsAppMessage, SuggestedAction } from "@soreya/shared";
import { useCallback, useEffect, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type WhatsAppStatusResponse = {
  connected?: boolean;
  displayPhoneNumber?: string | null;
  phoneNumberId?: string | null;
  verifiedName?: string | null;
  status?: string;
  lastSyncedAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncError?: string | null;
  error?: string;
};

type WhatsAppConfigForm = {
  businessAccountId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  accessToken: string;
  webhookVerifyToken: string;
};

type WhatsAppInboxRow = NormalizedWhatsAppMessage & {
  appointmentDetected: boolean;
};

const INITIAL_FORM: WhatsAppConfigForm = {
  businessAccountId: "",
  phoneNumberId: "",
  displayPhoneNumber: "",
  verifiedName: "",
  accessToken: "",
  webhookVerifyToken: "",
};

export function WhatsAppBusinessPanel() {
  const { locale, t, label } = useI18n();
  const [status, setStatus] = useState<WhatsAppStatusResponse | null>(null);
  const [form, setForm] = useState<WhatsAppConfigForm>(INITIAL_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const webhookUrl = "/api/whatsapp/webhook";

  const loadStatus = useCallback(async () => {
    setMessage(null);

    if (shouldUseWebDemoData()) {
      const demoStatus = getWebDemoData(locale).whatsappStatus;
      setStatus({
        connected: demoStatus.connected,
        displayPhoneNumber: demoStatus.displayPhoneNumber,
        phoneNumberId: "demo-phone-number-id",
        verifiedName: "[DEMO] Soreya Local",
        status: demoStatus.status,
        lastSyncedAt: demoStatus.lastSyncedAt,
        lastSyncStatus: demoStatus.lastSyncStatus ?? undefined,
        lastSyncError: demoStatus.lastSyncError,
      });
      setForm((current) => ({
        ...current,
        businessAccountId: "demo-business-account",
        phoneNumberId: "demo-phone-number-id",
        displayPhoneNumber: demoStatus.displayPhoneNumber ?? "",
        verifiedName: "[DEMO] Soreya Local",
      }));
      setMessage(t("demo.description"));
      setIsLoading(false);
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setStatus(null);
      setMessage("Supabase is not configured. WhatsApp status is unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      await syncCurrentSession(supabase);
      const response = await fetch("/api/whatsapp/status");
      const payload = (await response.json()) as WhatsAppStatusResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load WhatsApp status.");
      }

      setStatus(payload);
      setForm((current) => ({
        ...current,
        phoneNumberId: current.phoneNumberId || payload.phoneNumberId || "",
        displayPhoneNumber: current.displayPhoneNumber || payload.displayPhoneNumber || "",
        verifiedName: current.verifiedName || payload.verifiedName || "",
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load WhatsApp status.");
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void Promise.resolve().then(loadStatus);
  }, [loadStatus]);

  async function saveConfiguration() {
    setIsSaving(true);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setMessage(t("demo.description"));
      setForm((current) => ({ ...current, accessToken: "" }));
      setIsSaving(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      await syncCurrentSession(supabase);
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as WhatsAppStatusResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save WhatsApp configuration.");
      }

      setMessage(t("whatsapp.configurationSaved"));
      setForm((current) => ({ ...current, accessToken: "" }));
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save WhatsApp configuration.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-normal text-stone-950">{t("whatsapp.cloudApi")}</h3>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              {t("safety.approvalFirst")}
            </p>
            <div className="mt-3 space-y-1 text-sm text-stone-600">
              <p>{t("common.status")}: {isLoading ? t("common.loading") : status?.status ?? t("common.notConnected")}</p>
              <p>{t("whatsapp.phoneNumberId")}: {status?.phoneNumberId ?? "-"}</p>
              <p>{t("whatsapp.displayPhone")}: {status?.displayPhoneNumber ?? "-"}</p>
              <p>{t("sync.title")}: {status?.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "-"}</p>
              <p>{t("common.status")}: {label("syncStatus", status?.lastSyncStatus ?? "none")}</p>
              {status?.lastSyncError ? <p className="text-rose-700">{t("sync.lastError")}: {status.lastSyncError}</p> : null}
            </div>
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 lg:w-80">
            <p className="font-medium text-stone-950">{t("whatsapp.webhookUrl")}</p>
            <p className="mt-2 break-all font-mono text-xs">{webhookUrl}</p>
            <p className="mt-3 text-xs text-stone-500">{t("whatsapp.verifyTokenHint")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label={t("whatsapp.businessAccountId")} value={form.businessAccountId} onChange={(value) => setFormValue("businessAccountId", value, setForm)} />
        <TextInput label={t("whatsapp.phoneNumberId")} value={form.phoneNumberId} onChange={(value) => setFormValue("phoneNumberId", value, setForm)} />
        <TextInput label={t("whatsapp.displayPhone")} value={form.displayPhoneNumber} onChange={(value) => setFormValue("displayPhoneNumber", value, setForm)} />
        <TextInput label={t("whatsapp.verifiedName")} value={form.verifiedName} onChange={(value) => setFormValue("verifiedName", value, setForm)} />
        <TextInput label={t("whatsapp.accessToken")} value={form.accessToken} onChange={(value) => setFormValue("accessToken", value, setForm)} type="password" />
        <TextInput label={t("whatsapp.webhookVerifyToken")} value={form.webhookVerifyToken} onChange={(value) => setFormValue("webhookVerifyToken", value, setForm)} />
      </div>

      <button
        className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={isSaving}
        onClick={saveConfiguration}
        type="button"
      >
        {isSaving ? `${t("common.loading")}...` : t("whatsapp.saveConfiguration")}
      </button>

      {message ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
      ) : null}
    </div>
  );
}

export function WhatsAppInboxPanel() {
  const { locale, t } = useI18n();
  const [rows, setRows] = useState<WhatsAppInboxRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      if (shouldUseWebDemoData()) {
        setRows(getWebDemoData(locale).whatsappMessages.map((item) => ({ ...item, appointmentDetected: true })));
        setMessage(t("demo.description"));
        setIsLoading(false);
        return;
      }

      if (!hasSupabaseBrowserConfig()) {
        setMessage("Supabase is not configured. WhatsApp cache is unavailable.");
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const user = await getCurrentUser(supabase);

        if (!user) {
          setMessage("Sign in to view cached WhatsApp messages.");
          setIsLoading(false);
          return;
        }

        const userOrganization = await getUserOrganization(supabase, user.id);

        if (!userOrganization) {
          setMessage("Create an organization before receiving WhatsApp messages.");
          setIsLoading(false);
          return;
        }

        const messages = await getCachedWhatsAppMessages(supabase, userOrganization.organization.id, { limit: 10 });
        const appointmentMessageIds = await loadAppointmentMessageIds(
          supabase,
          userOrganization.organization.id,
          messages.map((item) => item.id),
        );

        if (isMounted) {
          setRows(messages.map((item) => ({ ...item, appointmentDetected: appointmentMessageIds.has(item.id) })));
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load WhatsApp messages.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [locale, t]);

  if (isLoading) {
    return <EmptyState title={`${t("common.loading")} WhatsApp`} detail={t("whatsapp.noMessages")} />;
  }

  if (message && !shouldUseWebDemoData()) {
    return <EmptyState title={t("whatsapp.inboxUnavailable")} detail={message} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        ctaHref="#settings"
        ctaLabel={t("empty.whatsapp.cta")}
        detail={t("empty.whatsapp.missing")}
        next={t("empty.whatsapp.next")}
        title={t("empty.whatsapp.title")}
        why={t("empty.whatsapp.why")}
      />
    );
  }

  return (
    <div className="mt-5 divide-y divide-stone-200 border-t border-stone-200">
      {message ? <p className="py-4 text-sm text-stone-600">{message}</p> : null}
      {rows.map((item) => (
        <div key={`${item.provider}-${item.providerMessageId}`} className="grid gap-2 py-4 lg:grid-cols-[150px_minmax(0,1fr)_150px]">
          <p className="text-sm font-medium text-stone-700">WhatsApp</p>
          <div>
            <p className="text-sm font-medium text-stone-950">{item.fromName ?? item.fromPhone ?? t("whatsapp.unknownSender")}</p>
            <p className="mt-1 text-sm text-stone-500">{item.textBody ?? t("whatsapp.nonTextMessage")}</p>
          </div>
          <p className="text-sm text-stone-500">{t("whatsapp.appointmentDetected")}: {item.appointmentDetected ? t("common.yes") : t("common.no")}</p>
        </div>
      ))}
    </div>
  );
}

export function WhatsAppApprovalsPanel() {
  const { locale, t, label } = useI18n();
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    if (shouldUseWebDemoData()) {
      setActions(
        getWebDemoData(locale).suggestedActions.filter((action) =>
          ["send_whatsapp_reply", "ask_whatsapp_more_info"].includes(action.action_type),
        ),
      );
      setMessage(t("demo.description"));
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setMessage("Supabase is not configured. WhatsApp approval queue is unavailable.");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        setMessage("Sign in to view WhatsApp approval actions.");
        return;
      }

      const userOrganization = await getUserOrganization(supabase, user.id);

      if (!userOrganization) {
        setMessage("Create an organization before reviewing WhatsApp approvals.");
        return;
      }

      const { data, error } = await supabase
        .from("suggested_actions")
        .select("*")
        .eq("organization_id", userOrganization.organization.id)
        .in("action_type", ["send_whatsapp_reply", "ask_whatsapp_more_info"])
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      setActions(data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load WhatsApp approvals.");
    }
  }, [locale, t]);

  useEffect(() => {
    void Promise.resolve().then(loadActions);
  }, [loadActions]);

  async function updateActionStatus(actionId: string, status: "approved" | "cancelled") {
    if (shouldUseWebDemoData()) {
      if (status === "approved") {
        setActions((current) =>
          current.map((action) =>
            action.id === actionId
              ? { ...action, status: "approved", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
              : action,
          ),
        );
        setMessage(t("approvals.demoApproved"));
      } else {
        setActions((current) => current.filter((action) => action.id !== actionId));
        setMessage(t("approvals.demoIgnored"));
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const user = await getCurrentUser(supabase);
    const update =
      status === "approved"
        ? { status, approved_by: user?.id ?? null, approved_at: new Date().toISOString() }
        : { status, approved_by: null, approved_at: null };
    const { error } = await supabase.from("suggested_actions").update(update).eq("id", actionId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadActions();
  }

  if (message && actions.length === 0 && !shouldUseWebDemoData()) {
    return <EmptyState title={t("common.unavailable")} detail={message} />;
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        ctaHref="#inbox"
        ctaLabel={t("empty.approvals.cta")}
        detail={t("empty.approvals.missing")}
        next={t("empty.approvals.next")}
        title={t("whatsapp.noReplies")}
        why={t("empty.approvals.why")}
      />
    );
  }

  return (
    <div className="mt-5 divide-y divide-stone-200 border-t border-stone-200">
      {message ? <p className="py-4 text-sm text-stone-600">{message}</p> : null}
      {actions.map((action) => {
        const draft = readDraftPayload(action);

        return (
          <div key={action.id} className="py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-stone-950">{action.title}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {draft.recipientPhone ?? "-"} · {label("actionTypes", action.action_type)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => updateActionStatus(action.id, "approved")}
                  type="button"
                >
                  {t("common.approve")}
                </button>
                <button
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                  onClick={() => setMessage(t("safety.noAutomaticActions"))}
                  type="button"
                >
                  {t("common.edit")}
                </button>
                <button
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                  onClick={() => updateActionStatus(action.id, "cancelled")}
                  type="button"
                >
                  {t("common.ignore")}
                </button>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
              {draft.body ?? "-"}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

async function syncCurrentSession(supabase: SoreyaSupabaseClient) {
  const { data } = await supabase.auth.getSession();
  await syncSupabaseSessionToServer(data.session);
}

async function loadAppointmentMessageIds(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
  messageIds: string[],
): Promise<Set<string>> {
  if (messageIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("appointment_requests")
    .select("incoming_message_id")
    .eq("organization_id", organizationId)
    .in("incoming_message_id", messageIds);

  if (error) {
    throw error;
  }

  return new Set(
    (data ?? [])
      .map((item) => item.incoming_message_id)
      .filter((id): id is string => Boolean(id)),
  );
}

function TextInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "password" | "text";
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      <input
        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none focus:border-stone-500"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function EmptyState({
  ctaHref,
  ctaLabel,
  detail,
  next,
  title,
  why,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  detail: string;
  next?: string;
  title: string;
  why?: string;
}) {
  return (
    <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-5">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{detail}</p>
      {why ? <p className="mt-3 text-sm leading-6 text-stone-600">{why}</p> : null}
      {next ? <p className="mt-2 text-sm leading-6 text-stone-600">{next}</p> : null}
      {ctaHref && ctaLabel ? (
        <a className="mt-4 inline-flex rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white" href={ctaHref}>
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}

function readDraftPayload(action: SuggestedAction): { body?: string; recipientPhone?: string } {
  if (!action.draft_payload || typeof action.draft_payload !== "object" || Array.isArray(action.draft_payload)) {
    return {};
  }

  return {
    body: typeof action.draft_payload.body === "string" ? action.draft_payload.body : undefined,
    recipientPhone:
      typeof action.draft_payload.recipientPhone === "string"
        ? action.draft_payload.recipientPhone
        : typeof action.draft_payload.to === "string"
          ? action.draft_payload.to
          : undefined,
  };
}

function setFormValue(
  key: keyof WhatsAppConfigForm,
  value: string,
  setForm: (updater: (current: WhatsAppConfigForm) => WhatsAppConfigForm) => void,
) {
  setForm((current) => ({ ...current, [key]: value }));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
