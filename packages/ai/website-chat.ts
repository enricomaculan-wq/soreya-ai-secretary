import type { Json, NormalizedEmailMessage } from "@soreya/shared";

export type WebsiteChatSubmission = {
  organizationId: string;
  sessionId: string;
  name?: string | null;
  email?: string | null;
  message: string;
  pageUrl?: string | null;
};

export function normalizeWebsiteChatMessage(
  submission: WebsiteChatSubmission,
  providerMessageId: string,
  accountId: string,
): NormalizedEmailMessage {
  const now = new Date().toISOString();

  return {
    id: providerMessageId,
    organizationId: submission.organizationId,
    provider: "gmail",
    providerMessageId,
    providerThreadId: submission.sessionId,
    emailAccountId: accountId,
    fromEmail: submission.email?.trim() || null,
    fromName: submission.name?.trim() || null,
    toEmails: [],
    ccEmails: [],
    subject: "Chat dal sito web",
    snippet: submission.message.trim().slice(0, 180),
    bodyText: submission.message.trim(),
    bodyHtml: null,
    receivedAt: now,
    hasAttachments: false,
    raw: {
      source: "website_chat",
      sessionId: submission.sessionId,
      pageUrl: submission.pageUrl ?? null,
    } as Json,
    createdAt: now,
    updatedAt: now,
  };
}
