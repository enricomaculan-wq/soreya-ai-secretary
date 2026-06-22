import { mergeWebsiteChatSettings, parseWebsiteChatSettings } from "@soreya/shared";

import type {
  Json,
  NormalizedWebsiteChatMessage,
  NormalizedWebsiteChatSession,
} from "@soreya/shared";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@soreya/shared";

type SoreyaSupabaseClient = SupabaseClient<Database>;

type WebsiteChatSessionRow = {
  id: string;
  organization_id: string;
  session_token: string;
  visitor_name: string | null;
  visitor_email: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type WebsiteChatMessageRow = {
  id: string;
  organization_id: string;
  session_id: string;
  direction: "incoming" | "outgoing";
  body_text: string;
  author_name: string | null;
  provider_message_id: string | null;
  created_at: string;
};

export async function createWebsiteChatSession(
  client: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    sessionToken: string;
    visitorName?: string | null;
    visitorEmail?: string | null;
    pageUrl?: string | null;
  },
): Promise<NormalizedWebsiteChatSession> {
  const { data, error } = await client
    .from("website_chat_sessions")
    .insert({
      organization_id: input.organizationId,
      session_token: input.sessionToken,
      visitor_name: input.visitorName ?? null,
      visitor_email: input.visitorEmail ?? null,
      page_url: input.pageUrl ?? null,
      status: "open",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toWebsiteChatSession(data as WebsiteChatSessionRow);
}

export async function getWebsiteChatSessionByToken(
  client: SoreyaSupabaseClient,
  sessionToken: string,
): Promise<NormalizedWebsiteChatSession | null> {
  const { data, error } = await client
    .from("website_chat_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toWebsiteChatSession(data as WebsiteChatSessionRow) : null;
}

export async function touchWebsiteChatSession(
  client: SoreyaSupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await client
    .from("website_chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw error;
  }
}

export async function insertWebsiteChatMessage(
  client: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    sessionId: string;
    direction: "incoming" | "outgoing";
    bodyText: string;
    authorName?: string | null;
    providerMessageId?: string | null;
  },
): Promise<NormalizedWebsiteChatMessage> {
  const { data, error } = await client
    .from("website_chat_messages")
    .insert({
      organization_id: input.organizationId,
      session_id: input.sessionId,
      direction: input.direction,
      body_text: input.bodyText,
      author_name: input.authorName ?? null,
      provider_message_id: input.providerMessageId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await touchWebsiteChatSession(client, input.sessionId);

  return toWebsiteChatMessage(data as WebsiteChatMessageRow);
}

export async function listWebsiteChatMessages(
  client: SoreyaSupabaseClient,
  sessionId: string,
  options?: { after?: string | null },
): Promise<NormalizedWebsiteChatMessage[]> {
  let query = client
    .from("website_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (options?.after) {
    query = query.gt("created_at", options.after);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toWebsiteChatMessage(row as WebsiteChatMessageRow));
}

export async function cacheIncomingWebsiteChatMessage(
  client: SoreyaSupabaseClient,
  organizationId: string,
  accountId: string,
  message: {
    providerMessageId: string;
    sessionId: string;
    fromName: string | null;
    fromEmail: string | null;
    bodyText: string;
    receivedAt: string;
    pageUrl: string | null;
    raw: Json;
  },
): Promise<void> {
  const { error } = await client
    .from("incoming_messages")
    .insert({
      organization_id: organizationId,
      connected_account_id: accountId,
      provider_message_id: message.providerMessageId,
      thread_id: message.sessionId,
      source_channel: "website_chat",
      direction: "incoming",
      status: "classified",
      from_name: message.fromName,
      from_email: message.fromEmail,
      subject: "Chat dal sito web",
      body_text: message.bodyText,
      received_at: message.receivedAt,
      classified_at: new Date().toISOString(),
      ai_classification: {},
      attachments: [],
      metadata: {
        source: "website_chat",
        sessionId: message.sessionId,
        pageUrl: message.pageUrl,
        raw: message.raw,
      },
    });

  if (error) {
    throw error;
  }
}

export async function getWebsiteChatSessionById(
  client: SoreyaSupabaseClient,
  organizationId: string,
  sessionId: string,
): Promise<NormalizedWebsiteChatSession | null> {
  const { data, error } = await client
    .from("website_chat_sessions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toWebsiteChatSession(data as WebsiteChatSessionRow) : null;
}

export async function updateOrganizationWebsiteChatSettings(
  client: SoreyaSupabaseClient,
  organizationId: string,
  patch: { enabled?: boolean },
) {
  const { data: organization, error: readError } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (readError) {
    throw readError;
  }

  const settings = mergeWebsiteChatSettings(organization.settings, patch);
  const { data, error } = await client
    .from("organizations")
    .update({
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    organization: data,
    websiteChat: parseWebsiteChatSettings(data.settings),
  };
}

export async function getCachedWebsiteChatInboxMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: { limit?: number } = {},
): Promise<NormalizedWebsiteChatMessage[]> {
  const { data, error } = await client
    .from("incoming_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("source_channel", "website_chat")
    .order("received_at", { ascending: false })
    .limit(filters.limit ?? 25);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    sessionId: row.thread_id ?? row.id,
    providerMessageId: row.provider_message_id ?? row.id,
    direction: "incoming" as const,
    bodyText: row.body_text,
    authorName: row.from_name,
    createdAt: row.received_at,
  }));
}

function toWebsiteChatSession(row: WebsiteChatSessionRow): NormalizedWebsiteChatSession {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sessionToken: row.session_token,
    visitorName: row.visitor_name,
    visitorEmail: row.visitor_email,
    pageUrl: row.page_url,
    status: row.status === "closed" ? "closed" : "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWebsiteChatMessage(row: WebsiteChatMessageRow): NormalizedWebsiteChatMessage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sessionId: row.session_id,
    providerMessageId: row.provider_message_id,
    direction: row.direction,
    bodyText: row.body_text,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}
