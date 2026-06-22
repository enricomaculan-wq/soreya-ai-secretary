import { getConnectedCalendarAccountByProvider, type SoreyaSupabaseClient } from "@soreya/database";
import type { ConnectedAccount, Json } from "@soreya/shared";

import { GOOGLE_CALENDAR_EVENTS_SCOPE } from "@/lib/server/calendar-api";
import { parseCalendarEventDraft, type ParsedCalendarEventDraft } from "@/lib/server/calendar-event-draft";
import { decryptToken } from "@/lib/server/token-encryption";
import { refreshAccountTokenIfNeeded } from "@/lib/server/token-refresh";

export type CreateGoogleCalendarEventInput = {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  event: ParsedCalendarEventDraft;
};

export type CreateGoogleCalendarEventResult = {
  providerEventId: string | null;
  htmlLink: string | null;
  response: Json;
};

export async function createGoogleCalendarEvent(
  input: CreateGoogleCalendarEventInput,
): Promise<CreateGoogleCalendarEventResult> {
  const account = await getConnectedCalendarAccountByProvider(input.supabase, input.organizationId, "google");

  if (!account) {
    throw new Error("Google Calendar is not connected for this organization.");
  }

  if (!account.scopes.includes(GOOGLE_CALENDAR_EVENTS_SCOPE)) {
    throw new Error(
      "Google Calendar write scope is missing. Disconnect and reconnect Google Calendar from Settings to grant event write permission.",
    );
  }

  const rawAccount = await readConnectedAccountRow(input.supabase, account.id);
  const refreshResult = await refreshAccountTokenIfNeeded(input.supabase, rawAccount);

  if (refreshResult.errorMessage) {
    throw new Error(refreshResult.errorMessage);
  }

  const refreshedAccount = await getConnectedCalendarAccountByProvider(input.supabase, input.organizationId, "google");

  if (!refreshedAccount?.accessTokenEncrypted) {
    throw new Error("Google Calendar access token is missing.");
  }

  const accessToken = decryptToken(refreshedAccount.accessTokenEncrypted);
  const attendees = input.event.customerEmail
    ? [{ email: input.event.customerEmail, displayName: input.event.customerName ?? undefined }]
    : undefined;

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: input.event.title,
      description: input.event.description ?? undefined,
      start: {
        dateTime: input.event.startsAt,
        timeZone: input.event.timezone,
      },
      end: {
        dateTime: input.event.endsAt,
        timeZone: input.event.timezone,
      },
      attendees,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const errorMessage =
      typeof payload.error === "object"
      && payload.error
      && typeof (payload.error as { message?: string }).message === "string"
        ? (payload.error as { message: string }).message
        : `Google Calendar create failed with status ${response.status}.`;

    throw new Error(errorMessage);
  }

  return {
    providerEventId: typeof payload.id === "string" ? payload.id : null,
    htmlLink: typeof payload.htmlLink === "string" ? payload.htmlLink : null,
    response: payload as Json,
  };
}

export function parseCalendarEventDraftFromAction(draft: Record<string, Json | undefined>) {
  return parseCalendarEventDraft(draft);
}

async function readConnectedAccountRow(
  supabase: SoreyaSupabaseClient,
  accountId: string,
): Promise<ConnectedAccount> {
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
