import type { Json, NormalizedEmailMessage } from "@soreya/shared";

export type WebsiteFormSubmission = {
  organizationId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message: string;
  service?: string | null;
  preferredDateTime?: string | null;
  pageUrl?: string | null;
  formName?: string | null;
};

export function normalizeWebsiteFormMessage(
  submission: WebsiteFormSubmission,
  providerMessageId: string,
  accountId: string,
): NormalizedEmailMessage {
  const now = new Date().toISOString();
  const subject = submission.service?.trim()
    ? `Richiesta dal sito: ${submission.service.trim()}`
    : "Richiesta appuntamento dal sito";
  const bodyParts = [
    submission.message.trim(),
    submission.preferredDateTime?.trim() ? `Preferenza orario: ${submission.preferredDateTime.trim()}` : null,
    submission.phone?.trim() ? `Telefono: ${submission.phone.trim()}` : null,
    submission.pageUrl?.trim() ? `Pagina: ${submission.pageUrl.trim()}` : null,
  ].filter(Boolean);

  return {
    id: providerMessageId,
    organizationId: submission.organizationId,
    provider: "gmail",
    providerMessageId,
    providerThreadId: null,
    emailAccountId: accountId,
    fromEmail: submission.email?.trim() || null,
    fromName: submission.name?.trim() || null,
    toEmails: [],
    ccEmails: [],
    subject,
    snippet: bodyParts[0]?.slice(0, 180) ?? null,
    bodyText: bodyParts.join("\n"),
    bodyHtml: null,
    receivedAt: now,
    hasAttachments: false,
    raw: {
      source: "website_form",
      formName: submission.formName ?? null,
      pageUrl: submission.pageUrl ?? null,
      phone: submission.phone ?? null,
      service: submission.service ?? null,
      preferredDateTime: submission.preferredDateTime ?? null,
    } as Json,
    createdAt: now,
    updatedAt: now,
  };
}
