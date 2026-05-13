import {
  analyzeEmailWithAI,
  buildAppointmentRequestFromIntent,
  buildCalendarConflict,
  generateEmailReplyDraft,
  generateNeedMoreInfoReply,
  normalizeGmailMessage,
  normalizeGoogleCalendarEvent,
  normalizeMicrosoftCalendarEvent,
  normalizeMicrosoftMailMessage,
} from "@soreya/ai";
import {
  cacheCalendarEvents,
  cacheIncomingEmailMessages,
  createAppointmentRequestFromEmail,
  createEmailReplySuggestion,
  createSyncLog,
  getCachedCalendarEvents,
  getConnectedCalendarAccountByProvider,
  getConnectedEmailAccountByProvider,
  markAccountSyncFinished,
  markAccountSyncStarted,
  updateSyncLog,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type { ConnectedAccount } from "@soreya/shared";

import {
  buildCalendarSyncRange,
  buildEmailSyncRange,
  readSyncCalendarLimit,
  readSyncEmailLimit,
  readSyncLookaheadDays,
} from "@/lib/server/sync-config";
import { decryptToken } from "@/lib/server/token-encryption";
import { refreshAccountTokenIfNeeded } from "@/lib/server/token-refresh";

type GoogleEventsResponse = {
  items?: Record<string, unknown>[];
  nextPageToken?: string;
  error?: { message?: string };
};

type MicrosoftCollectionResponse = {
  value?: Record<string, unknown>[];
  "@odata.nextLink"?: string;
  error?: { message?: string };
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
  nextPageToken?: string;
  error?: { message?: string };
};

export async function syncGoogleCalendar(supabase: SoreyaSupabaseClient, organizationId: string) {
  const account = await getConnectedCalendarAccountByProvider(supabase, organizationId, "google");

  if (!account) {
    return { provider: "google", skipped: true, error: "Google Calendar is not connected." };
  }

  const syncLog = await createSyncLog(supabase, {
    organizationId,
    provider: "google_calendar",
    jobType: "calendar_sync",
    status: "running",
  });

  try {
    await markAccountSyncStarted(supabase, account.id);
    const refreshResult = await refreshAccountTokenIfNeeded(supabase, await readRawConnectedAccount(supabase, account.id));

    if (refreshResult.errorMessage) {
      throw new Error(refreshResult.errorMessage);
    }

    const refreshedAccount = await getConnectedCalendarAccountByProvider(supabase, organizationId, "google");

    if (!refreshedAccount?.accessTokenEncrypted) {
      throw new Error("Google Calendar access token is missing.");
    }

    const accessToken = decryptToken(refreshedAccount.accessTokenEncrypted);
    const range = buildCalendarSyncRange();
    const maxEvents = readSyncCalendarLimit();
    const events: ReturnType<typeof normalizeGoogleCalendarEvent>[] = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const apiUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      apiUrl.searchParams.set("timeMin", range.start);
      apiUrl.searchParams.set("timeMax", range.end);
      apiUrl.searchParams.set("singleEvents", "true");
      apiUrl.searchParams.set("orderBy", "startTime");
      apiUrl.searchParams.set("maxResults", String(Math.min(250, maxEvents - events.length)));

      if (pageToken) {
        apiUrl.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as GoogleEventsResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Google Calendar sync failed.");
      }

      events.push(...(payload.items ?? []).map((event) => normalizeGoogleCalendarEvent(event, refreshedAccount)));
      pageToken = payload.nextPageToken;
      pages += 1;
    } while (pageToken && events.length < maxEvents && pages < 10);

    const limitedEvents = events.slice(0, maxEvents);
    const count = await cacheCalendarEvents(supabase, organizationId, account.id, limitedEvents);
    await markAccountSyncFinished(supabase, account.id, "success");
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "success",
      recordsRead: events.length,
      recordsCreated: count,
      metadata: { range, pages, maxEvents, refreshResult },
    });

    return { provider: "google", count, recordsRead: events.length, range, pages, refreshResult };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar sync failed.";
    await markAccountSyncFinished(supabase, account.id, "failed", message);
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "failed",
      errorMessage: message,
    });
    throw error;
  }
}

export async function syncMicrosoftCalendar(supabase: SoreyaSupabaseClient, organizationId: string) {
  const account = await getConnectedCalendarAccountByProvider(supabase, organizationId, "microsoft");

  if (!account) {
    return { provider: "microsoft", skipped: true, error: "Microsoft Outlook Calendar is not connected." };
  }

  const syncLog = await createSyncLog(supabase, {
    organizationId,
    provider: "microsoft_calendar",
    jobType: "calendar_sync",
    status: "running",
  });

  try {
    await markAccountSyncStarted(supabase, account.id);
    const refreshResult = await refreshAccountTokenIfNeeded(supabase, await readRawConnectedAccount(supabase, account.id));

    if (refreshResult.errorMessage) {
      throw new Error(refreshResult.errorMessage);
    }

    const refreshedAccount = await getConnectedCalendarAccountByProvider(supabase, organizationId, "microsoft");

    if (!refreshedAccount?.accessTokenEncrypted) {
      throw new Error("Microsoft Calendar access token is missing.");
    }

    const accessToken = decryptToken(refreshedAccount.accessTokenEncrypted);
    const range = buildCalendarSyncRange();
    const maxEvents = readSyncCalendarLimit();
    const events: ReturnType<typeof normalizeMicrosoftCalendarEvent>[] = [];
    let nextLink: string | undefined;
    let pages = 0;

    do {
      const apiUrl = nextLink ? new URL(nextLink) : new URL("https://graph.microsoft.com/v1.0/me/events");

      if (!nextLink) {
        apiUrl.searchParams.set(
          "$select",
          "id,subject,bodyPreview,location,start,end,attendees,showAs,isCancelled,isAllDay,createdDateTime,lastModifiedDateTime",
        );
        apiUrl.searchParams.set("$filter", `start/dateTime ge '${range.start}' and end/dateTime le '${range.end}'`);
        apiUrl.searchParams.set("$orderby", "start/dateTime");
        apiUrl.searchParams.set("$top", String(Math.min(100, maxEvents - events.length)));
      }

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.timezone="UTC"',
        },
      });
      const payload = (await response.json()) as MicrosoftCollectionResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Microsoft Calendar sync failed.");
      }

      events.push(...(payload.value ?? []).map((event) => normalizeMicrosoftCalendarEvent(event, refreshedAccount)));
      nextLink = payload["@odata.nextLink"];
      pages += 1;
    } while (nextLink && events.length < maxEvents && pages < 10);

    const limitedEvents = events.slice(0, maxEvents);
    const count = await cacheCalendarEvents(supabase, organizationId, account.id, limitedEvents);
    await markAccountSyncFinished(supabase, account.id, "success");
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "success",
      recordsRead: events.length,
      recordsCreated: count,
      metadata: { range, pages, maxEvents, refreshResult },
    });

    return { provider: "microsoft", count, recordsRead: events.length, range, pages, refreshResult };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Microsoft Calendar sync failed.";
    await markAccountSyncFinished(supabase, account.id, "failed", message);
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "failed",
      errorMessage: message,
    });
    throw error;
  }
}

export async function syncGmail(supabase: SoreyaSupabaseClient, organizationId: string, timezone: string) {
  const account = await getConnectedEmailAccountByProvider(supabase, organizationId, "gmail");

  if (!account) {
    return { provider: "gmail", skipped: true, error: "Gmail is not connected." };
  }

  const syncLog = await createSyncLog(supabase, {
    organizationId,
    provider: "gmail",
    jobType: "email_sync",
    status: "running",
  });

  try {
    await markAccountSyncStarted(supabase, account.id);
    const refreshResult = await refreshAccountTokenIfNeeded(supabase, await readRawConnectedAccount(supabase, account.id));

    if (refreshResult.errorMessage) {
      throw new Error(refreshResult.errorMessage);
    }

    const refreshedAccount = await getConnectedEmailAccountByProvider(supabase, organizationId, "gmail");

    if (!refreshedAccount?.accessTokenEncrypted) {
      throw new Error("Gmail access token is missing.");
    }

    const accessToken = decryptToken(refreshedAccount.accessTokenEncrypted, "EMAIL_TOKEN_ENCRYPTION_KEY");
    const maxMessages = readSyncEmailLimit();
    const range = buildEmailSyncRange();
    const messageRefs: Array<{ id: string; threadId?: string }> = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      listUrl.searchParams.set("maxResults", String(Math.min(100, maxMessages - messageRefs.length)));
      listUrl.searchParams.set("q", `after:${Math.floor(new Date(range.start).getTime() / 1000)} -category:promotions -category:social`);

      if (pageToken) {
        listUrl.searchParams.set("pageToken", pageToken);
      }

      const listResponse = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const listPayload = (await listResponse.json()) as GmailListResponse;

      if (!listResponse.ok) {
        throw new Error(listPayload.error?.message ?? "Gmail sync failed.");
      }

      messageRefs.push(...(listPayload.messages ?? []));
      pageToken = listPayload.nextPageToken;
      pages += 1;
    } while (pageToken && messageRefs.length < maxMessages && pages < 10);

    const rawMessages = await Promise.all(
      messageRefs.slice(0, maxMessages).map(async (message) => {
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return (await response.json()) as Record<string, unknown>;
      }),
    );
    const messages = rawMessages.map((message) => normalizeGmailMessage(message, refreshedAccount));
    const analyzedCount = await cacheIncomingEmailMessages(supabase, organizationId, account.id, messages);
    const processing = await analyzeAppointmentEmails(supabase, organizationId, timezone, messages, "gmail");
    await markAccountSyncFinished(supabase, account.id, "success");
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "success",
      recordsRead: messageRefs.length,
      recordsCreated: analyzedCount + processing.appointmentRequests + processing.suggestedActions,
      metadata: { range, pages, maxMessages, refreshResult, processing },
    });

    return {
      provider: "gmail",
      emailsAnalyzed: analyzedCount,
      recordsRead: messageRefs.length,
      pages,
      ...processing,
      refreshResult,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail sync failed.";
    await markAccountSyncFinished(supabase, account.id, "failed", message);
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "failed",
      errorMessage: message,
    });
    throw error;
  }
}

export async function syncMicrosoftMail(supabase: SoreyaSupabaseClient, organizationId: string, timezone: string) {
  const account = await getConnectedEmailAccountByProvider(supabase, organizationId, "microsoft");

  if (!account) {
    return { provider: "microsoft", skipped: true, error: "Microsoft Outlook Mail is not connected." };
  }

  const syncLog = await createSyncLog(supabase, {
    organizationId,
    provider: "microsoft_mail",
    jobType: "email_sync",
    status: "running",
  });

  try {
    await markAccountSyncStarted(supabase, account.id);
    const refreshResult = await refreshAccountTokenIfNeeded(supabase, await readRawConnectedAccount(supabase, account.id));

    if (refreshResult.errorMessage) {
      throw new Error(refreshResult.errorMessage);
    }

    const refreshedAccount = await getConnectedEmailAccountByProvider(supabase, organizationId, "microsoft");

    if (!refreshedAccount?.accessTokenEncrypted) {
      throw new Error("Microsoft Mail access token is missing.");
    }

    const accessToken = decryptToken(refreshedAccount.accessTokenEncrypted, "EMAIL_TOKEN_ENCRYPTION_KEY");
    const range = buildEmailSyncRange();
    const maxMessages = readSyncEmailLimit();
    const messagesRaw: Record<string, unknown>[] = [];
    let nextLink: string | undefined;
    let pages = 0;

    do {
      const apiUrl = nextLink ? new URL(nextLink) : new URL("https://graph.microsoft.com/v1.0/me/messages");

      if (!nextLink) {
        apiUrl.searchParams.set("$top", String(Math.min(100, maxMessages - messagesRaw.length)));
        apiUrl.searchParams.set("$orderby", "receivedDateTime desc");
        apiUrl.searchParams.set("$filter", `receivedDateTime ge ${range.start}`);
        apiUrl.searchParams.set(
          "$select",
          "id,conversationId,subject,from,toRecipients,ccRecipients,body,bodyPreview,receivedDateTime,hasAttachments",
        );
      }

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as MicrosoftCollectionResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Microsoft Mail sync failed.");
      }

      messagesRaw.push(...(payload.value ?? []));
      nextLink = payload["@odata.nextLink"];
      pages += 1;
    } while (nextLink && messagesRaw.length < maxMessages && pages < 10);

    const messages = messagesRaw.slice(0, maxMessages).map((message) => normalizeMicrosoftMailMessage(message, refreshedAccount));
    const analyzedCount = await cacheIncomingEmailMessages(supabase, organizationId, account.id, messages);
    const processing = await analyzeAppointmentEmails(supabase, organizationId, timezone, messages, "microsoft");
    await markAccountSyncFinished(supabase, account.id, "success");
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "success",
      recordsRead: messagesRaw.length,
      recordsCreated: analyzedCount + processing.appointmentRequests + processing.suggestedActions,
      metadata: { range, pages, maxMessages, refreshResult, processing },
    });

    return {
      provider: "microsoft",
      emailsAnalyzed: analyzedCount,
      recordsRead: messagesRaw.length,
      pages,
      ...processing,
      refreshResult,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Microsoft Mail sync failed.";
    await markAccountSyncFinished(supabase, account.id, "failed", message);
    await updateSyncLog(supabase, {
      organizationId,
      syncLogId: syncLog.id,
      status: "failed",
      errorMessage: message,
    });
    throw error;
  }
}

async function analyzeAppointmentEmails(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
  timezone: string,
  messages: Array<ReturnType<typeof normalizeGmailMessage>>,
  provider: "gmail" | "microsoft",
) {
  const calendarRange = calendarLookaheadRange();
  const calendarEvents = await getCachedCalendarEvents(supabase, organizationId, calendarRange.start, calendarRange.end);
  let appointmentRequests = 0;
  let suggestedActions = 0;

  for (const message of messages) {
    const intent = await analyzeEmailWithAI(message, { timezone });

    if (!intent.isAppointmentRequest) {
      continue;
    }

    const requestDraft = buildAppointmentRequestFromIntent(message, intent);
    const conflict = intent.requestedStartsAt && intent.requestedEndsAt
      ? buildCalendarConflict(calendarEvents, {}, intent.requestedStartsAt, intent.requestedEndsAt)
      : null;
    const appointmentRequest = await createAppointmentRequestFromEmail(supabase, {
      organizationId,
      message,
      intent,
      conflictDetected: Boolean(conflict?.conflictingEvents.length),
      conflictReason: conflict?.conflictingEvents.length ? "Requested time overlaps cached calendar events." : null,
      alternatives: conflict?.alternatives ?? [],
    });
    appointmentRequests += 1;

    const reply = intent.needsMoreInfo
      ? generateNeedMoreInfoReply(message, ["preferred date", "preferred time"])
      : generateEmailReplyDraft(message, requestDraft, conflict);

    await createEmailReplySuggestion(supabase, {
      organizationId,
      provider,
      messageId: message.providerMessageId,
      subject: reply.subject,
      body: intent.suggestedReplyBody ?? reply.body,
      recipient: reply.recipient,
      appointmentRequestId: appointmentRequest.id,
      actionType: intent.needsMoreInfo ? "ask_email_more_info" : "send_email_reply",
      metadata: {
        aiProvider: intent.aiProvider ?? "heuristic",
        aiModel: intent.aiModel ?? null,
        usedFallback: intent.usedFallback ?? true,
        confidence: intent.confidence,
        safetyNotes: intent.safetyNotes ?? [],
        missingFields: intent.missingFields ?? [],
      },
    });
    suggestedActions += 1;
  }

  return { appointmentRequests, suggestedActions };
}

async function readRawConnectedAccount(supabase: SoreyaSupabaseClient, accountId: string): Promise<ConnectedAccount> {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function calendarLookaheadRange() {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + readSyncLookaheadDays());

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
