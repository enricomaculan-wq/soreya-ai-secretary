import {
  getCachedIncomingMessages,
  getCachedTelegramMessages,
  getCachedWebsiteChatInboxMessages,
  getCachedWebsiteFormMessages,
  getCachedWhatsAppMessages,
} from "@soreya/database";
import type {
  NormalizedEmailMessage,
  NormalizedTelegramMessage,
  NormalizedWebsiteChatMessage,
  NormalizedWebsiteFormMessage,
  NormalizedWhatsAppMessage,
} from "@soreya/shared";

import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export type InboxMessageItem =
  | {
      kind: "email";
      id: string;
      receivedAt: string;
      title: string;
      preview: string;
      sender: string;
    }
  | {
      kind: "whatsapp";
      id: string;
      receivedAt: string;
      title: string;
      preview: string;
      sender: string;
    }
  | {
      kind: "telegram";
      id: string;
      receivedAt: string;
      title: string;
      preview: string;
      sender: string;
    }
  | {
      kind: "website_form";
      id: string;
      receivedAt: string;
      title: string;
      preview: string;
      sender: string;
    }
  | {
      kind: "website_chat";
      id: string;
      receivedAt: string;
      title: string;
      preview: string;
      sender: string;
    };

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const url = new URL(request.url);
    const limit = clampLimit(url.searchParams.get("limit"));
    const perChannel = Math.max(1, Math.ceil(limit / 5));
    const organizationId = context.userOrganization.organization.id;

    const [emailMessages, whatsappMessages, telegramMessages, websiteFormMessages, websiteChatMessages] = await Promise.all([
      getCachedIncomingMessages(context.supabase, organizationId, { limit: perChannel }),
      getCachedWhatsAppMessages(context.supabase, organizationId, { limit: perChannel }),
      getCachedTelegramMessages(context.supabase, organizationId, { limit: perChannel }),
      getCachedWebsiteFormMessages(context.supabase, organizationId, { limit: perChannel }),
      getCachedWebsiteChatInboxMessages(context.supabase, organizationId, { limit: perChannel }),
    ]);

    const items = [
      ...emailMessages.map((message) => toEmailInboxItem(message)),
      ...whatsappMessages.map((message) => toWhatsAppInboxItem(message)),
      ...telegramMessages.map((message) => toTelegramInboxItem(message)),
      ...websiteFormMessages.map((message) => toWebsiteFormInboxItem(message)),
      ...websiteChatMessages.map((message) => toWebsiteChatInboxItem(message)),
    ]
      .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
      .slice(0, limit);

    return Response.json({
      items,
      emailCount: emailMessages.length,
      whatsappCount: whatsappMessages.length,
      telegramCount: telegramMessages.length,
      websiteFormCount: websiteFormMessages.length,
      websiteChatCount: websiteChatMessages.length,
      readOnly: true,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function clampLimit(value: string | null) {
  const parsed = Number(value ?? 12);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 12;
  }

  return Math.min(Math.floor(parsed), 50);
}

function toEmailInboxItem(message: NormalizedEmailMessage): InboxMessageItem {
  return {
    kind: "email",
    id: `email-${message.providerMessageId}`,
    receivedAt: message.receivedAt,
    title: message.subject ?? "No subject",
    preview: message.snippet ?? message.bodyText ?? "",
    sender: message.fromName ?? message.fromEmail ?? "Unknown sender",
  };
}

function toWhatsAppInboxItem(message: NormalizedWhatsAppMessage): InboxMessageItem {
  return {
    kind: "whatsapp",
    id: `wa-${message.providerMessageId}`,
    receivedAt: message.receivedAt,
    title: message.fromName ?? message.fromPhone ?? "WhatsApp",
    preview: message.textBody ?? "",
    sender: message.fromName ?? message.fromPhone ?? "Unknown sender",
  };
}

function toTelegramInboxItem(message: NormalizedTelegramMessage): InboxMessageItem {
  return {
    kind: "telegram",
    id: `tg-${message.providerMessageId}`,
    receivedAt: message.receivedAt,
    title: message.fromName ?? message.fromUsername ?? "Telegram",
    preview: message.textBody ?? "",
    sender: message.fromName ?? (message.fromUsername ? `@${message.fromUsername}` : message.fromChatId ?? "Unknown sender"),
  };
}

function toWebsiteFormInboxItem(message: NormalizedWebsiteFormMessage): InboxMessageItem {
  return {
    kind: "website_form",
    id: `form-${message.providerMessageId}`,
    receivedAt: message.receivedAt,
    title: message.subject ?? "Richiesta dal sito",
    preview: message.bodyText ?? "",
    sender: message.fromName ?? message.fromEmail ?? message.fromPhone ?? "Visitatore sito",
  };
}

function toWebsiteChatInboxItem(message: NormalizedWebsiteChatMessage): InboxMessageItem {
  return {
    kind: "website_chat",
    id: `chat-${message.providerMessageId ?? message.id}`,
    receivedAt: message.createdAt,
    title: "Chat dal sito web",
    preview: message.bodyText ?? "",
    sender: message.authorName ?? "Visitatore chat",
  };
}
