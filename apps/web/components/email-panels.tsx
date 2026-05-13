"use client";

import {
  getCachedIncomingMessages,
  getCurrentUser,
  getEmailConnectionStatuses,
  getUserOrganization,
} from "@soreya/database";
import type { EmailConnectionStatus, NormalizedEmailMessage, SuggestedAction } from "@soreya/shared";
import { useCallback, useEffect, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type EmailProvider = "gmail" | "microsoft";

const PROVIDERS: Array<{
  provider: EmailProvider;
  title: string;
  descriptionKey: string;
  connectHref: string;
  syncHref: string;
}> = [
  {
    provider: "gmail",
    title: "Gmail",
    descriptionKey: "email.gmailDescription",
    connectHref: "/api/email/google/start",
    syncHref: "/api/email/google/sync",
  },
  {
    provider: "microsoft",
    title: "Microsoft Outlook Mail",
    descriptionKey: "email.outlookDescription",
    connectHref: "/api/email/microsoft/start",
    syncHref: "/api/email/microsoft/sync",
  },
];

export function EmailAccountsPanel() {
  const { locale, t, label } = useI18n();
  const [statuses, setStatuses] = useState<EmailConnectionStatus[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState<EmailProvider | null>(null);

  const loadStatuses = useCallback(async () => {
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setStatuses(getWebDemoData(locale).emailStatuses);
      setMessage(t("demo.description"));
      setIsLoading(false);
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setStatuses([]);
      setMessage("Supabase is not configured. Email connection status is unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        setStatuses([]);
        setMessage("Sign in to manage email accounts.");
        return;
      }

      const userOrganization = await getUserOrganization(supabase, user.id);
      const { data: sessionData } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(sessionData.session);

      if (!userOrganization) {
        setStatuses([]);
        setMessage("Create an organization before connecting email accounts.");
        return;
      }

      setStatuses(await getEmailConnectionStatuses(supabase, userOrganization.organization.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load email accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void Promise.resolve().then(loadStatuses);
  }, [loadStatuses]);

  async function syncNow(provider: EmailProvider, syncHref: string) {
    setSyncingProvider(provider);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setMessage(t("demo.description"));
      setSyncingProvider(null);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(data.session);

      const response = await fetch(syncHref, { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        emailsAnalyzed?: number;
        appointmentRequests?: number;
        suggestedActions?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Email sync failed.");
      }

      setMessage(
        `Analyzed ${payload.emailsAnalyzed ?? 0} emails, created ${payload.appointmentRequests ?? 0} appointment requests and ${payload.suggestedActions ?? 0} approval actions.`,
      );
      await loadStatuses();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Email sync failed.");
    } finally {
      setSyncingProvider(null);
    }
  }

  return (
    <div className="space-y-4">
      {PROVIDERS.map((provider) => {
        const status = statuses.find((candidate) => candidate.provider === provider.provider);
        const connected = Boolean(status?.connected);
        const demoMode = shouldUseWebDemoData();

        return (
          <div key={provider.provider} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-normal text-stone-950">{provider.title}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-500">{t(provider.descriptionKey)}</p>
                <div className="mt-3 space-y-1 text-sm text-stone-600">
                  <p>{t("common.status")}: {isLoading ? t("common.loading") : label("syncStatus", status?.status ?? "none") || t("common.notConnected")}</p>
                  <p>Email: {status?.email ?? t("common.notConnected")}</p>
                  <p>{t("sync.title")}: {status?.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "-"}</p>
                  <p>{t("common.status")}: {label("syncStatus", status?.lastSyncStatus ?? "none")}</p>
                  {status?.lastSyncError ? <p className="text-rose-700">{t("sync.lastError")}: {status.lastSyncError}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {demoMode ? (
                  <button
                    className="rounded-md border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-500"
                    disabled
                    type="button"
                  >
                    {t("demo.badge")}
                  </button>
                ) : (
                  <a
                    className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
                    href={provider.connectHref}
                  >
                    {t("common.connect")}
                  </a>
                )}
                <button
                  className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  disabled={!connected || syncingProvider === provider.provider}
                  onClick={() => syncNow(provider.provider, provider.syncHref)}
                  type="button"
                >
                  {syncingProvider === provider.provider ? `${t("common.loading")}...` : t("email.syncNow")}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {message ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
      ) : null}
    </div>
  );
}

export function UnifiedInboxPanel() {
  const { locale, t, label } = useI18n();
  const [messages, setMessages] = useState<NormalizedEmailMessage[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      if (shouldUseWebDemoData()) {
        setMessages(getWebDemoData(locale).emailMessages);
        setMessage(t("demo.description"));
        setIsLoading(false);
        return;
      }

      if (!hasSupabaseBrowserConfig()) {
        setMessage("Supabase is not configured. Email cache is unavailable.");
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const user = await getCurrentUser(supabase);

        if (!user) {
          setMessage("Sign in to view cached incoming messages.");
          setIsLoading(false);
          return;
        }

        const userOrganization = await getUserOrganization(supabase, user.id);

        if (!userOrganization) {
          setMessage("Create an organization before syncing email.");
          setIsLoading(false);
          return;
        }

        const rows = await getCachedIncomingMessages(supabase, userOrganization.organization.id, { limit: 10 });

        if (isMounted) {
          setMessages(rows);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load incoming messages.");
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
    return <EmptyState title={`${t("common.loading")} ${t("navigation.inbox").toLowerCase()}`} detail={t("email.noMessages")} />;
  }

  if (message && !shouldUseWebDemoData()) {
    return <EmptyState title={t("email.inboxUnavailable")} detail={message} />;
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        ctaHref="#settings"
        ctaLabel={t("empty.email.cta")}
        detail={t("empty.email.missing")}
        next={t("empty.email.next")}
        title={t("empty.email.title")}
        why={t("empty.email.why")}
      />
    );
  }

  return (
    <div className="mt-5 divide-y divide-stone-200 border-t border-stone-200">
      {message ? <p className="py-4 text-sm text-stone-600">{message}</p> : null}
      {messages.map((email) => (
        <div key={`${email.provider}-${email.providerMessageId}`} className="grid gap-2 py-4 lg:grid-cols-[120px_minmax(0,1fr)_140px]">
          <p className="text-sm font-medium capitalize text-stone-700">{label("providers", email.provider)}</p>
          <div>
            <p className="text-sm font-medium text-stone-950">{email.subject ?? t("email.noSubject")}</p>
            <p className="mt-1 text-sm text-stone-500">
              {email.fromName ?? email.fromEmail ?? t("email.unknownSender")} · {email.snippet ?? t("common.none")}
            </p>
          </div>
          <p className="text-sm text-stone-500">{t("calendar.cachedEvents")}</p>
        </div>
      ))}
    </div>
  );
}

export function EmailApprovalsPanel() {
  const { locale, t, label } = useI18n();
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    if (shouldUseWebDemoData()) {
      setActions(
        getWebDemoData(locale).suggestedActions.filter((action) =>
          ["send_email_reply", "create_email_draft", "ask_email_more_info"].includes(action.action_type),
        ),
      );
      setMessage(t("demo.description"));
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setMessage("Supabase is not configured. Approval queue is unavailable.");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        setMessage("Sign in to view email approval actions.");
        return;
      }

      const userOrganization = await getUserOrganization(supabase, user.id);

      if (!userOrganization) {
        setMessage("Create an organization before reviewing email approvals.");
        return;
      }

      const { data, error } = await supabase
        .from("suggested_actions")
        .select("*")
        .eq("organization_id", userOrganization.organization.id)
        .in("action_type", ["send_email_reply", "create_email_draft", "ask_email_more_info"])
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      setActions(data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load email approvals.");
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
    const { error } = await supabase.from("suggested_actions").update({ status }).eq("id", actionId);

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
        title={t("email.noReplies")}
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
                  {draft.recipient ?? "-"} · {label("actionTypes", action.action_type)}
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

function readDraftPayload(action: SuggestedAction): { body?: string; recipient?: string } {
  if (!action.draft_payload || typeof action.draft_payload !== "object" || Array.isArray(action.draft_payload)) {
    return {};
  }

  return {
    body: typeof action.draft_payload.body === "string" ? action.draft_payload.body : undefined,
    recipient:
      typeof action.draft_payload.recipient === "string"
        ? action.draft_payload.recipient
        : typeof action.draft_payload.to === "string"
          ? action.draft_payload.to
          : undefined,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
