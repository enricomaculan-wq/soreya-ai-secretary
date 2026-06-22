import {
  mergeTelegramSettings,
  parseTelegramSettings,
  toConnectedTelegramAccount,
  toNormalizedTelegramMessage,
  type AppointmentRequest,
  type AvailabilitySlot,
  type ConnectedTelegramAccount,
  type Database,
  type Json,
  type MessageStatus,
  type NormalizedTelegramMessage,
  type SuggestedAction,
  type TelegramAppointmentIntent,
  type TelegramConnectionStatus,
  type TelegramProvider,
  type TelegramReplyActionType,
  type TelegramSettings,
} from "@soreya/shared";

import type { SupabaseClient } from "@supabase/supabase-js";

type SoreyaSupabaseClient = SupabaseClient<Database>;

export type UpsertConnectedTelegramAccountInput = {
  organizationId: string;
  ownerUserId?: string | null;
  botUserId: string;
  botUsername?: string | null;
  displayName?: string | null;
  webhookSecret?: string | null;
  enabled?: boolean;
  accessTokenEncrypted?: string | null;
  status?: ConnectedTelegramAccount["status"];
  metadata?: Json;
};

export type TelegramMessageFilters = Partial<{
  limit: number;
  status: MessageStatus;
  receivedAfter: string;
  receivedBefore: string;
}>;

export type CreateAppointmentRequestFromTelegramInput = {
  organizationId: string;
  message: NormalizedTelegramMessage;
  intent: TelegramAppointmentIntent;
  conflictDetected?: boolean;
  conflictReason?: string | null;
  alternatives?: AvailabilitySlot[] | Json;
};

export type CreateTelegramReplySuggestionInput = {
  organizationId: string;
  provider: TelegramProvider;
  messageId: string;
  botUserId: string;
  recipientChatId: string;
  body: string;
  appointmentRequestId?: string | null;
  actionType?: TelegramReplyActionType;
  rationale?: string | null;
  metadata?: Json;
};

function mergeJsonObjects(base: Json | undefined, patch: Record<string, Json | null>): Json {
  const current = base && typeof base === "object" && !Array.isArray(base) ? base : {};

  return {
    ...current,
    ...patch,
  };
}

function readMatchedServicesFromConstraints(constraints: Json): Array<{ id: string; name?: string }> {
  if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) {
    return [];
  }

  const matchedServices = (constraints as Record<string, unknown>).matchedServices;

  if (!Array.isArray(matchedServices)) {
    return [];
  }

  return matchedServices
    .filter((item): item is { id: string; name?: string } =>
      Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"),
    );
}

function resolveCombinedServiceDurationMinutes(services: Array<{ id: string }>): number | null {
  void services;
  return null;
}

function readJsonMetadata(metadata: Json | undefined, key: string): Json | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  return (metadata as Record<string, Json | undefined>)[key];
}

export async function getConnectedTelegramAccounts(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<ConnectedTelegramAccount[]> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", "telegram")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toConnectedTelegramAccount);
}

export async function getConnectedTelegramAccount(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<ConnectedTelegramAccount | null> {
  const accounts = await getConnectedTelegramAccounts(client, organizationId);
  return accounts[0] ?? null;
}

export async function getConnectedTelegramAccountByBotUserId(
  client: SoreyaSupabaseClient,
  botUserId: string,
): Promise<ConnectedTelegramAccount | null> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .eq("provider", "telegram")
    .eq("provider_account_id", botUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toConnectedTelegramAccount(data) : null;
}

export async function getConnectedTelegramAccountByWebhookSecret(
  client: SoreyaSupabaseClient,
  webhookSecret: string,
): Promise<ConnectedTelegramAccount | null> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .eq("provider", "telegram")
    .filter("metadata->>webhookSecret", "eq", webhookSecret)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toConnectedTelegramAccount(data) : null;
}

export async function upsertConnectedTelegramAccount(
  client: SoreyaSupabaseClient,
  input: UpsertConnectedTelegramAccountInput,
): Promise<ConnectedTelegramAccount> {
  const metadata = mergeJsonObjects(input.metadata, {
    botUserId: input.botUserId,
    botUsername: input.botUsername ?? null,
    displayName: input.displayName ?? null,
    webhookSecret: input.webhookSecret ?? null,
    enabled: input.enabled ?? true,
  });

  const { data, error } = await client
    .from("connected_accounts")
    .upsert(
      {
        organization_id: input.organizationId,
        owner_user_id: input.ownerUserId ?? null,
        provider: "telegram",
        provider_account_id: input.botUserId,
        display_name: input.displayName ?? input.botUsername ?? null,
        email: null,
        status: input.status ?? "active",
        scopes: ["telegram_bot_messaging"],
        encrypted_access_token: input.accessTokenEncrypted ?? null,
        encrypted_refresh_token: null,
        token_expires_at: null,
        metadata,
        last_sync_error: null,
      },
      { onConflict: "organization_id,provider,provider_account_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: channelError } = await client
    .from("communication_channels")
    .upsert(
      {
        organization_id: input.organizationId,
        connected_account_id: data.id,
        type: "telegram",
        external_id: input.botUserId,
        name: input.displayName ?? input.botUsername ?? "Telegram Bot",
        address: input.botUsername ? `@${input.botUsername}` : input.botUserId,
        status: input.enabled === false || input.status === "disabled" ? "disconnected" : "active",
        metadata: {
          provider: "telegram_bot",
          botUserId: input.botUserId,
          botUsername: input.botUsername ?? null,
        },
      },
      { onConflict: "organization_id,type,external_id" },
    );

  if (channelError) {
    throw channelError;
  }

  return toConnectedTelegramAccount(data);
}

export async function cacheIncomingTelegramMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  accountId: string,
  messages: NormalizedTelegramMessage[],
): Promise<number> {
  if (messages.length === 0) {
    return 0;
  }

  const rows = messages.map((message) => ({
    organization_id: organizationId,
    connected_account_id: accountId,
    provider_message_id: message.providerMessageId,
    thread_id: message.providerThreadId,
    telegram_provider: message.provider,
    telegram_chat_id: message.fromChatId,
    telegram_message_id: message.providerMessageId,
    telegram_message_type: message.messageType,
    source_channel: "telegram" as const,
    from_name: message.fromName,
    direction: "incoming" as const,
    status: "classified" as const,
    subject: null,
    snippet: message.textBody?.slice(0, 180) ?? null,
    body_text: message.textBody,
    body_html: null,
    has_attachments: message.messageType !== "text",
    received_at: message.receivedAt,
    classified_at: new Date().toISOString(),
    ai_classification: {},
    attachments: [],
    metadata: {
      provider: message.provider,
      fromUsername: message.fromUsername,
      raw: message.raw,
    },
  }));

  const { error } = await client
    .from("incoming_messages")
    .upsert(rows, { onConflict: "organization_id,connected_account_id,provider_message_id" });

  if (error) {
    throw error;
  }

  return messages.length;
}

export async function getCachedTelegramMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: TelegramMessageFilters = {},
): Promise<NormalizedTelegramMessage[]> {
  let query = client
    .from("incoming_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .not("telegram_provider", "is", null)
    .order("received_at", { ascending: false })
    .limit(filters.limit ?? 25);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.receivedAfter) {
    query = query.gte("received_at", filters.receivedAfter);
  }

  if (filters.receivedBefore) {
    query = query.lte("received_at", filters.receivedBefore);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toNormalizedTelegramMessage);
}

export async function markTelegramAccountSyncStatus(
  client: SoreyaSupabaseClient,
  accountId: string,
  status: ConnectedTelegramAccount["status"],
  errorMessage?: string,
): Promise<void> {
  const update: Database["public"]["Tables"]["connected_accounts"]["Update"] = {
    status,
    last_sync_error: errorMessage ?? null,
    last_sync_status: status === "active" ? "success" : "failed",
    last_sync_at: new Date().toISOString(),
  };

  if (status === "active") {
    update.last_synced_at = update.last_sync_at;
  }

  const { error } = await client
    .from("connected_accounts")
    .update(update)
    .eq("id", accountId);

  if (error) {
    throw error;
  }
}

export async function getTelegramConnectionStatus(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<TelegramConnectionStatus> {
  const account = await getConnectedTelegramAccount(client, organizationId);

  return {
    provider: "telegram_bot",
    connected: Boolean(account && account.status === "active" && account.enabled),
    botUsername: account?.botUsername ?? null,
    status: account?.status ?? "not_connected",
    lastSyncedAt: account?.lastSyncedAt ?? null,
    lastSyncStatus: account?.lastSyncStatus ?? null,
    lastSyncError: account?.lastSyncError ?? null,
  };
}

export async function createAppointmentRequestFromTelegram(
  client: SoreyaSupabaseClient,
  input: CreateAppointmentRequestFromTelegramInput,
): Promise<AppointmentRequest> {
  const { data: messageRow, error: messageError } = await client
    .from("incoming_messages")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("connected_account_id", input.message.telegramAccountId)
    .eq("provider_message_id", input.message.providerMessageId)
    .maybeSingle();

  if (messageError) {
    throw messageError;
  }

  const matchedServices = readMatchedServicesFromConstraints(input.intent.extractedConstraints);
  const matchedService = matchedServices[0] ?? null;
  const { data, error } = await client
    .from("appointment_requests")
    .insert({
      organization_id: input.organizationId,
      incoming_message_id: messageRow?.id ?? null,
      service_id: matchedService?.id ?? null,
      source_channel: "telegram",
      status: input.conflictDetected ? "conflict_detected" : "needs_review",
      title: input.intent.reason ?? "Telegram appointment request",
      requested_start: input.intent.requestedStartsAt,
      requested_end: input.intent.requestedEndsAt,
      requested_timezone: input.intent.timezone,
      duration_minutes: matchedServices.length > 0
        ? resolveCombinedServiceDurationMinutes(matchedServices)
        : null,
      location: null,
      confidence: input.intent.confidence,
      conflict_detected: input.conflictDetected ?? false,
      conflict_reason: input.conflictReason ?? null,
      alternatives: input.alternatives ?? [],
      extracted_details: {
        provider: input.message.provider,
        providerMessageId: input.message.providerMessageId,
        customerName: input.intent.customerName,
        customerChatId: input.message.fromChatId,
        requestedDateTimeText: input.intent.requestedDateTimeText,
        reason: input.intent.reason,
        needsMoreInfo: input.intent.needsMoreInfo,
        missingFields: input.intent.missingFields ?? [],
        aiProvider: input.intent.aiProvider ?? "heuristic",
        aiModel: input.intent.aiModel ?? null,
        usedFallback: input.intent.usedFallback ?? true,
        confidence: input.intent.confidence,
        safetyNotes: input.intent.safetyNotes ?? [],
        extractedConstraints: input.intent.extractedConstraints,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTelegramReplySuggestion(
  client: SoreyaSupabaseClient,
  input: CreateTelegramReplySuggestionInput,
): Promise<SuggestedAction> {
  const { data, error } = await client
    .from("suggested_actions")
    .insert({
      organization_id: input.organizationId,
      appointment_request_id: input.appointmentRequestId ?? null,
      action_type: input.actionType ?? "send_telegram_reply",
      status: "pending_approval",
      title: input.actionType === "ask_telegram_more_info" ? "Ask Telegram more info" : "Telegram reply suggestion",
      rationale: input.rationale ?? "Telegram reply suggestion awaiting explicit user approval.",
      draft_payload: {
        provider: input.provider,
        messageId: input.messageId,
        botUserId: input.botUserId,
        recipientChatId: input.recipientChatId,
        body: input.body,
        appointmentRequestId: input.appointmentRequestId ?? null,
        aiProvider: readJsonMetadata(input.metadata, "aiProvider"),
        aiModel: readJsonMetadata(input.metadata, "aiModel"),
        usedFallback: readJsonMetadata(input.metadata, "usedFallback"),
        confidence: readJsonMetadata(input.metadata, "confidence"),
        safetyNotes: readJsonMetadata(input.metadata, "safetyNotes"),
        missingFields: readJsonMetadata(input.metadata, "missingFields"),
      },
      external_payload: {},
      risk_level: "normal",
      requires_approval: true,
      created_by_ai: true,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOrganizationTelegramSettings(
  client: SoreyaSupabaseClient,
  organizationId: string,
  patch: Partial<TelegramSettings>,
) {
  const { data: organization, error: readError } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (readError) {
    throw readError;
  }

  const settings = mergeTelegramSettings(organization.settings, patch);
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
    telegram: parseTelegramSettings(data.settings),
  };
}
