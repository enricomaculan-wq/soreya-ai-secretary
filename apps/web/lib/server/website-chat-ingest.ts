import { randomUUID } from "node:crypto";

import { normalizeWebsiteChatMessage } from "@soreya/ai";
import {
  cacheIncomingWebsiteChatMessage,
  ensureWebsiteFormConnectedAccount,
  insertWebsiteChatMessage,
} from "@soreya/database";
import type { NormalizedEmailMessage } from "@soreya/shared";

import { analyzeAppointmentEmails } from "@/lib/server/provider-sync";

export type WebsiteChatMessageInput = {
  organizationId: string;
  timezone: string;
  sessionId: string;
  name?: string | null;
  email?: string | null;
  message: string;
  pageUrl?: string | null;
};

export async function ingestWebsiteChatMessage(
  supabase: Parameters<typeof analyzeAppointmentEmails>[0],
  input: WebsiteChatMessageInput,
) {
  const accountId = await ensureWebsiteFormConnectedAccount(supabase, input.organizationId);
  const providerMessageId = `website-chat-${randomUUID()}`;
  const normalizedForAnalysis = normalizeWebsiteChatMessage(
    {
      organizationId: input.organizationId,
      sessionId: input.sessionId,
      name: input.name,
      email: input.email,
      message: input.message,
      pageUrl: input.pageUrl,
    },
    providerMessageId,
    accountId,
  );

  const chatMessage = await insertWebsiteChatMessage(supabase, {
    organizationId: input.organizationId,
    sessionId: input.sessionId,
    direction: "incoming",
    bodyText: input.message,
    authorName: input.name?.trim() || null,
    providerMessageId,
  });

  await cacheIncomingWebsiteChatMessage(supabase, input.organizationId, accountId, {
    providerMessageId,
    sessionId: input.sessionId,
    fromName: normalizedForAnalysis.fromName,
    fromEmail: normalizedForAnalysis.fromEmail,
    bodyText: normalizedForAnalysis.bodyText ?? input.message,
    receivedAt: normalizedForAnalysis.receivedAt,
    pageUrl: input.pageUrl?.trim() || null,
    raw: normalizedForAnalysis.raw,
  });

  const processing = await analyzeAppointmentEmails(
    supabase,
    input.organizationId,
    input.timezone,
    [normalizedForAnalysis as NormalizedEmailMessage],
    "gmail",
  );

  return {
    providerMessageId,
    chatMessage,
    ...processing,
  };
}
