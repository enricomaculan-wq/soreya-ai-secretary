"use client";

import type { NormalizedEmailMessage, NormalizedWhatsAppMessage } from "@soreya/shared";
import { useEffect, useState } from "react";

import type { InboxMessageItem } from "@/app/api/inbox/messages/route";
import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";

type InboxItem =
  | { kind: "email"; id: string; title: string; preview: string; sender: string; channelLabel: string }
  | { kind: "whatsapp"; id: string; title: string; preview: string; sender: string; channelLabel: string }
  | { kind: "telegram"; id: string; title: string; preview: string; sender: string; channelLabel: string };

export function DashboardInboxPanel() {
  const { locale, t } = useI18n();
  const demoMode = shouldUseWebDemoData();
  const [liveItems, setLiveItems] = useState<InboxItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) {
      return;
    }

    let isMounted = true;

    async function loadInbox() {
      try {
        const response = await fetch("/api/inbox/messages?limit=12");
        const payload = (await response.json()) as { items?: InboxMessageItem[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? t("email.inboxUnavailable"));
        }

        if (!isMounted) {
          return;
        }

        setLiveItems((payload.items ?? []).map((item) => toInboxItem(item, t)));
        setLoadError(null);
      } catch (error) {
        if (isMounted) {
          setLiveItems([]);
          setLoadError(error instanceof Error ? error.message : t("email.inboxUnavailable"));
        }
      }
    }

    void loadInbox();

    return () => {
      isMounted = false;
    };
  }, [demoMode, t]);

  const items = demoMode ? buildDemoInboxItems(locale, t) : liveItems ?? [];

  if (!demoMode && liveItems === null) {
    return (
      <p className="py-4 text-sm text-stone-500">
        {t("common.loading")}…
      </p>
    );
  }

  if (loadError && items.length === 0) {
    return <p className="py-4 text-sm text-amber-800">{loadError}</p>;
  }

  if (items.length === 0) {
    return <p className="py-4 text-sm text-stone-500">{t("email.noMessages")}</p>;
  }

  return (
    <div>
      {items.map((item) => (
        <article className="soreya-list-row grid gap-3 lg:grid-cols-[92px_minmax(0,1fr)]" key={item.id}>
          <div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                item.kind === "whatsapp"
                  ? "border-[var(--trust-border)] bg-[var(--trust-soft)] text-[var(--trust)]"
                  : "border-sky-200 bg-sky-50 text-sky-800"
              }`}
            >
              {item.channelLabel}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-950">{item.title}</p>
            <p className="mt-1 text-sm text-stone-500">
              {item.sender} · {item.preview}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function buildDemoInboxItems(locale: Parameters<typeof getWebDemoData>[0], t: (key: string) => string): InboxItem[] {
  const demo = getWebDemoData(locale);

  return [
    ...demo.emailMessages.slice(0, 4).map((message: NormalizedEmailMessage) => ({
      kind: "email" as const,
      id: `email-${message.providerMessageId}`,
      title: message.subject ?? t("email.noSubject"),
      preview: message.snippet ?? message.bodyText ?? "",
      sender: message.fromName ?? message.fromEmail ?? t("email.unknownSender"),
      channelLabel: t("labels.providers.email"),
    })),
    ...demo.whatsappMessages.slice(0, 3).map((message: NormalizedWhatsAppMessage) => ({
      kind: "whatsapp" as const,
      id: `wa-${message.providerMessageId}`,
      title: message.fromName ?? message.fromPhone ?? t("labels.providers.whatsapp"),
      preview: message.textBody ?? "",
      sender: message.fromName ?? message.fromPhone ?? t("email.unknownSender"),
      channelLabel: t("labels.providers.whatsapp"),
    })),
  ];
}

function toInboxItem(item: InboxMessageItem, t: (key: string) => string): InboxItem {
  const channelLabel =
    item.kind === "whatsapp"
      ? t("labels.providers.whatsapp")
      : item.kind === "telegram"
        ? t("labels.providers.telegram")
        : item.kind === "website_form"
          ? t("websiteForm.title")
          : item.kind === "website_chat"
            ? t("websiteChat.title")
            : t("labels.providers.email");

  return {
    kind: item.kind === "website_form" || item.kind === "website_chat" ? "email" : item.kind,
    id: item.id,
    title: item.title,
    preview: item.preview,
    sender: item.sender,
    channelLabel,
  };
}
