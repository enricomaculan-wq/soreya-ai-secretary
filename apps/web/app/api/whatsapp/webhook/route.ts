import {
  analyzeWhatsAppWithAI,
  buildAppointmentRequestFromWhatsAppIntent,
  buildCalendarConflict,
  filterAlternativesForBrainConstraints,
  finalizeSchedulingReplyForBrain,
  generateWhatsAppNeedMoreInfoReply,
  generateWhatsAppReplyDraft,
  normalizeWhatsAppWebhookMessage,
  resolveBrainCalendarRules,
  resolveRequestedAppointmentWindow,
  resolveSchedulingWhatsAppReplyBody,
} from "@soreya/ai";
import {
  cacheIncomingWhatsAppMessages,
  createAppointmentRequestFromWhatsApp,
  createWhatsAppReplySuggestion,
  getCachedCalendarEvents,
  getConnectedWhatsAppAccountByPhoneNumberId,
  getOrganizationBrainContext,
  markWhatsAppAccountSyncStatus,
} from "@soreya/database";

import { createIntegrationServerSupabaseClient } from "@/lib/server/supabase";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { jsonError, readWhatsAppWebhookVerifyToken } from "@/lib/server/whatsapp-api";
import { verifyWhatsAppSignature } from "@/lib/server/whatsapp-webhook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const verifyToken = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && verifyToken === readWhatsAppWebhookVerifyToken() && challenge) {
      return new Response(challenge, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden", { status: 403 });
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/whatsapp/webhook" });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const rawBody = await request.text();
    const signatureResult = verifyWhatsAppSignature(rawBody, request.headers.get("x-hub-signature-256"));

    if (!signatureResult.allowed) {
      return Response.json({ ok: false, error: signatureResult.reason }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const supabase = createIntegrationServerSupabaseClient();
    let receivedMessages = 0;
    let cachedMessages = 0;
    let appointmentRequests = 0;
    let suggestedActions = 0;
    let unconfiguredMessages = 0;

    for (const entry of toArray(payload.entry).map(toRecord)) {
      for (const change of toArray(entry.changes).map(toRecord)) {
        const value = toRecord(change.value);
        const metadata = toRecord(value.metadata);
        const phoneNumberId = readString(metadata.phone_number_id);
        const messages = toArray(value.messages).map(toRecord);
        const contactsByWaId = buildContactsByWaId(value.contacts);

        if (!phoneNumberId || messages.length === 0) {
          continue;
        }

        const account = await getConnectedWhatsAppAccountByPhoneNumberId(supabase, phoneNumberId);

        if (!account) {
          unconfiguredMessages += messages.length;
          continue;
        }

        const normalizedMessages = messages.map((message) =>
          normalizeWhatsAppWebhookMessage(
            {
              ...message,
              profileName: contactsByWaId.get(readString(message.from) ?? "") ?? null,
            },
            account,
          ),
        );

        receivedMessages += normalizedMessages.length;
        cachedMessages += await cacheIncomingWhatsAppMessages(
          supabase,
          account.organizationId,
          account.id,
          normalizedMessages,
        );

        const calendarRange = calendarLookaheadRange();
        const [calendarEvents, brainContext] = await Promise.all([
          getCachedCalendarEvents(
            supabase,
            account.organizationId,
            calendarRange.start,
            calendarRange.end,
          ),
          getOrganizationBrainContext(supabase, account.organizationId),
        ]);

        for (const message of normalizedMessages) {
          const intent = await analyzeWhatsAppWithAI(message, { brainContext });

          if (!intent.isAppointmentRequest) {
            continue;
          }

          const requestDraft = buildAppointmentRequestFromWhatsAppIntent(message, intent);
          const calendarRules = resolveBrainCalendarRules(intent.extractedConstraints);
          const appointmentWindow = resolveRequestedAppointmentWindow(
            intent.requestedStartsAt,
            intent.requestedEndsAt,
            intent.extractedConstraints,
          );
          const conflict = appointmentWindow.startsAt && appointmentWindow.endsAt
            ? buildCalendarConflict(
              calendarEvents,
              calendarRules,
              appointmentWindow.startsAt,
              appointmentWindow.endsAt,
            )
            : null;
          const previousAlternativeCount = conflict?.alternatives.length ?? 0;
          const alternatives = filterAlternativesForBrainConstraints(
            conflict?.alternatives ?? [],
            intent.extractedConstraints,
          );
          const finalizedIntent = finalizeSchedulingReplyForBrain(intent, alternatives, {
            customerText: message.textBody ?? "",
            previousAlternativeCount,
          });
          const appointmentRequest = await createAppointmentRequestFromWhatsApp(supabase, {
            organizationId: account.organizationId,
            message,
            intent: finalizedIntent,
            conflictDetected: Boolean(conflict?.conflictingEvents.length),
            conflictReason: conflict?.conflictingEvents.length ? "Requested time overlaps cached calendar events." : null,
            alternatives,
          });
          appointmentRequests += 1;

          const reply = finalizedIntent.needsMoreInfo
            ? generateWhatsAppNeedMoreInfoReply(message, finalizedIntent.missingFields ?? ["date/time"])
            : generateWhatsAppReplyDraft(message, requestDraft, conflict);
          const replyBody = resolveSchedulingWhatsAppReplyBody(reply.body, finalizedIntent.suggestedReplyBody);

          await createWhatsAppReplySuggestion(supabase, {
            organizationId: account.organizationId,
            provider: "whatsapp_business_cloud",
            messageId: message.providerMessageId,
            phoneNumberId,
            recipientPhone: reply.recipientPhone,
            body: replyBody,
            appointmentRequestId: appointmentRequest.id,
            actionType: finalizedIntent.needsMoreInfo ? "ask_whatsapp_more_info" : "send_whatsapp_reply",
            metadata: intentMetadata(finalizedIntent),
          });
          suggestedActions += 1;
        }

        await markWhatsAppAccountSyncStatus(supabase, account.id, "active");
      }
    }

    return Response.json({
      ok: true,
      receivedMessages,
      cachedMessages,
      appointmentRequests,
      suggestedActions,
      unconfiguredMessages,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 },
    );
  }
}

function intentMetadata(intent: Awaited<ReturnType<typeof analyzeWhatsAppWithAI>>) {
  return {
    aiProvider: intent.aiProvider ?? "heuristic",
    aiModel: intent.aiModel ?? null,
    usedFallback: intent.usedFallback ?? true,
    confidence: intent.confidence,
    safetyNotes: intent.safetyNotes ?? [],
    missingFields: intent.missingFields ?? [],
  };
}

function buildContactsByWaId(value: unknown): Map<string, string | null> {
  const contacts = new Map<string, string | null>();

  for (const contact of toArray(value).map(toRecord)) {
    const waId = readString(contact.wa_id);
    const profileName = readString(toRecord(contact.profile).name);

    if (waId) {
      contacts.set(waId, profileName);
    }
  }

  return contacts;
}

function calendarLookaheadRange() {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 30);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
