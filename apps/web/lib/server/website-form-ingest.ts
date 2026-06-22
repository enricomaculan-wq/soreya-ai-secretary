import { randomUUID } from "node:crypto";

import { normalizeWebsiteFormMessage } from "@soreya/ai";
import {
  cacheIncomingWebsiteFormMessage,
  ensureWebsiteFormConnectedAccount,
} from "@soreya/database";
import type { NormalizedEmailMessage } from "@soreya/shared";

import { analyzeAppointmentEmails } from "@/lib/server/provider-sync";

export type WebsiteFormSubmissionInput = {
  organizationId: string;
  timezone: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message: string;
  service?: string | null;
  preferredDateTime?: string | null;
  pageUrl?: string | null;
  formName?: string | null;
};

export async function ingestWebsiteFormSubmission(
  supabase: Parameters<typeof analyzeAppointmentEmails>[0],
  input: WebsiteFormSubmissionInput,
) {
  const accountId = await ensureWebsiteFormConnectedAccount(supabase, input.organizationId);
  const providerMessageId = `website-form-${randomUUID()}`;
  const normalizedForAnalysis = normalizeWebsiteFormMessage(
    {
      organizationId: input.organizationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      service: input.service,
      preferredDateTime: input.preferredDateTime,
      pageUrl: input.pageUrl,
      formName: input.formName,
    },
    providerMessageId,
    accountId,
  );

  await cacheIncomingWebsiteFormMessage(supabase, input.organizationId, accountId, {
    id: providerMessageId,
    organizationId: input.organizationId,
    providerMessageId,
    fromName: normalizedForAnalysis.fromName,
    fromEmail: normalizedForAnalysis.fromEmail,
    fromPhone: input.phone?.trim() || null,
    subject: normalizedForAnalysis.subject,
    bodyText: normalizedForAnalysis.bodyText,
    receivedAt: normalizedForAnalysis.receivedAt,
    pageUrl: input.pageUrl?.trim() || null,
    formName: input.formName?.trim() || null,
    raw: normalizedForAnalysis.raw,
    createdAt: normalizedForAnalysis.createdAt,
    updatedAt: normalizedForAnalysis.updatedAt,
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
    ...processing,
  };
}
