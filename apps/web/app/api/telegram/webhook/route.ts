import {
  analyzeTelegramWithAI,
  buildAppointmentRequestFromTelegramIntent,
  buildCalendarConflict,
  filterAlternativesForBrainConstraints,
  finalizeSchedulingReplyForBrain,
  generateTelegramNeedMoreInfoReply,
  generateTelegramReplyDraft,
  normalizeTelegramWebhookMessage,
  resolveBrainCalendarRules,
  resolveRequestedAppointmentWindow,
  resolveSchedulingTelegramReplyBody,
} from "@soreya/ai";
import {
  cacheIncomingTelegramMessages,
  createAppointmentRequestFromTelegram,
  createTelegramReplySuggestion,
  getCachedCalendarEvents,
  getConnectedTelegramAccountByWebhookSecret,
  getOrganizationBrainContext,
  markTelegramAccountSyncStatus,
} from "@soreya/database";

import { createIntegrationServerSupabaseClient } from "@/lib/server/supabase";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { extractTelegramMessage, verifyTelegramWebhookSecret } from "@/lib/server/telegram-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/telegram/webhook" });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const rawBody = await request.text();
    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const supabase = createIntegrationServerSupabaseClient();

    const accountFromSecret = secretHeader
      ? await getConnectedTelegramAccountByWebhookSecret(supabase, secretHeader)
      : null;
    const secretResult = verifyTelegramWebhookSecret(
      secretHeader,
      accountFromSecret?.webhookSecret ?? null,
    );

    if (!secretResult.allowed) {
      return Response.json({ ok: false, error: secretResult.reason }, { status: 401 });
    }

    const rawMessage = extractTelegramMessage(payload);

    if (!rawMessage) {
      return Response.json({ ok: true, receivedMessages: 0, cachedMessages: 0 });
    }

    const account = accountFromSecret;

    if (!account || !account.enabled) {
      return Response.json({
        ok: true,
        receivedMessages: 1,
        cachedMessages: 0,
        unconfiguredMessages: 1,
      });
    }

    const normalizedMessage = normalizeTelegramWebhookMessage(rawMessage, account);
    const cachedMessages = await cacheIncomingTelegramMessages(
      supabase,
      account.organizationId,
      account.id,
      [normalizedMessage],
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

    let appointmentRequests = 0;
    let suggestedActions = 0;
    const intent = await analyzeTelegramWithAI(normalizedMessage, { brainContext });

    if (intent.isAppointmentRequest) {
      const requestDraft = buildAppointmentRequestFromTelegramIntent(normalizedMessage, intent);
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
        customerText: normalizedMessage.textBody ?? "",
        previousAlternativeCount,
      });
      const appointmentRequest = await createAppointmentRequestFromTelegram(supabase, {
        organizationId: account.organizationId,
        message: normalizedMessage,
        intent: finalizedIntent,
        conflictDetected: Boolean(conflict?.conflictingEvents.length),
        conflictReason: conflict?.conflictingEvents.length ? "Requested time overlaps cached calendar events." : null,
        alternatives,
      });
      appointmentRequests = 1;

      const reply = finalizedIntent.needsMoreInfo
        ? generateTelegramNeedMoreInfoReply(normalizedMessage, finalizedIntent.missingFields ?? ["date/time"])
        : generateTelegramReplyDraft(normalizedMessage, requestDraft, conflict);
      const replyBody = resolveSchedulingTelegramReplyBody(reply.body, finalizedIntent.suggestedReplyBody);

      await createTelegramReplySuggestion(supabase, {
        organizationId: account.organizationId,
        provider: "telegram_bot",
        messageId: normalizedMessage.providerMessageId,
        botUserId: account.botUserId,
        recipientChatId: reply.recipientChatId,
        body: replyBody,
        appointmentRequestId: appointmentRequest.id,
        actionType: finalizedIntent.needsMoreInfo ? "ask_telegram_more_info" : "send_telegram_reply",
        metadata: intentMetadata(finalizedIntent),
      });
      suggestedActions = 1;
    }

    await markTelegramAccountSyncStatus(supabase, account.id, "active");

    return Response.json({
      ok: true,
      receivedMessages: 1,
      cachedMessages,
      appointmentRequests,
      suggestedActions,
      unconfiguredMessages: 0,
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

function intentMetadata(intent: Awaited<ReturnType<typeof analyzeTelegramWithAI>>) {
  return {
    aiProvider: intent.aiProvider ?? "heuristic",
    aiModel: intent.aiModel ?? null,
    usedFallback: intent.usedFallback ?? true,
    confidence: intent.confidence,
    safetyNotes: intent.safetyNotes ?? [],
    missingFields: intent.missingFields ?? [],
  };
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
