import type { NotificationType } from "@soreya/shared";

export type WebsiteInboundChannel = "form" | "chat";

export function buildWebsiteInboundNotificationPayload(
  channel: WebsiteInboundChannel,
  messageSnippet: string,
): { type: NotificationType; title: string; body: string } {
  return {
    type: "appointment_request_detected",
    title: channel === "form" ? "Nuova richiesta dal form sito" : "Nuovo messaggio in chat sito",
    body: truncateWebsiteInboundSnippet(messageSnippet),
  };
}

export function truncateWebsiteInboundSnippet(messageSnippet: string, maxLength = 120): string {
  const normalized = messageSnippet.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Nuovo messaggio in arrivo.";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
