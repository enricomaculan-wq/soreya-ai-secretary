import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
  type User,
} from "@supabase/supabase-js";
import {
  toConnectedCalendarAccount,
  toConnectedEmailAccount,
  toConnectedWhatsAppAccount,
  toDailySummary,
  toDailySummarySettings,
  toEmergencyAction,
  toExecutionRecord,
  toSyncLog,
  toQuickCallNote,
  toNormalizedEmailMessage,
  toNormalizedCalendarEvent,
  toNormalizedWhatsAppMessage,
  toNotificationPreferences,
  toRegisteredDevice,
  toRegisteredNotificationToken,
  toRescheduleBatch,
  toRescheduleProposal,
  type ApprovalDecision,
  type ApprovalLogEvent,
  type ApprovalLogRecord,
  type ApprovalState,
  type AppointmentIntent,
  type AppointmentRequest,
  type AvailabilitySlot,
  type CalendarActionType,
  type CalendarConnectionStatus,
  type CalendarProvider,
  type ConnectedCalendarAccount,
  type ConnectedEmailAccount,
  type ConnectedWhatsAppAccount,
  type Database,
  type DailySummary,
  type DailySummarySettings,
  type DeviceCapability,
  type DeviceType,
  type EmailConnectionStatus,
  type EmailProvider,
  type EmailReplyActionType,
  type EmergencyAction,
  type EmergencyActionStatus,
  type EmergencyActionType,
  type EmergencyMessageTone,
  type EmergencySuggestedActionDraft,
  type EmergencyTargetWindow,
  type ExecutionRecord,
  type ExecutionStatus,
  type ExecutionType,
  type Json,
  type NormalizedEmailMessage,
  type NormalizedWebsiteFormMessage,
  type NormalizedCalendarEvent,
  type NormalizedWhatsAppMessage,
  mergeWebsiteFormSettings,
  mergeWebsiteChatSettings,
  mergeAddedSettingsChannels,
  parseWebsiteFormSettings,
  parseWebsiteChatSettings,
  parseAddedSettingsChannels,
  type SettingsChannelId,
  type NotificationPreferences,
  type Organization,
  type OrganizationMember,
  type QuickCallAnalysis,
  type QuickCallIntentType,
  type QuickCallNote,
  type QuickCallNoteStatus,
  type QuickCallSuggestedActionDraft,
  type RegisteredDevice,
  type RegisteredNotificationToken,
  type RescheduleBatch,
  type RescheduleProposal,
  type SmartwatchPlatform,
  type SuggestedAction,
  type SuggestedActionType,
  type SyncJobType,
  type SyncLog,
  type SyncProvider,
  type SyncStatus,
  type UserRule,
  type WhatsAppAppointmentIntent,
  type WhatsAppConnectionStatus,
  type WhatsAppProvider,
  type WhatsAppReplyActionType,
  readMatchedServicesFromConstraints,
  readMatchedServiceFromConstraints,
  resolveCombinedServiceDurationMinutes,
} from "@soreya/shared";

export type SoreyaSupabaseClient = SupabaseClient<Database>;

export type UserOrganization = {
  organization: Organization;
  membership: OrganizationMember;
};

export type CreateOrganizationInput = {
  name: string;
  slug?: string;
  timezone?: string;
};

export type UpsertConnectedCalendarAccountInput = {
  organizationId: string;
  provider: CalendarProvider;
  providerAccountId: string;
  email?: string | null;
  displayName?: string | null;
  accessTokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
  expiresAt?: string | null;
  scopes?: string[];
  status?: ConnectedCalendarAccount["status"];
  ownerUserId?: string | null;
  metadata?: Json;
};

export type CalendarActionProposalInput = {
  organizationId: string;
  provider: CalendarProvider;
  actionType: CalendarActionType;
  payload: Json;
  appointmentRequestId?: string | null;
  title?: string;
  rationale?: string | null;
  riskLevel?: SuggestedAction["risk_level"];
};

export type UpsertConnectedEmailAccountInput = {
  organizationId: string;
  provider: EmailProvider;
  providerAccountId: string;
  email?: string | null;
  displayName?: string | null;
  accessTokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
  expiresAt?: string | null;
  scopes?: string[];
  status?: ConnectedEmailAccount["status"];
  ownerUserId?: string | null;
  metadata?: Json;
};

export type IncomingMessageFilters = Partial<{
  provider: EmailProvider;
  status: Database["public"]["Enums"]["message_status"];
  limit: number;
  receivedAfter: string;
  receivedBefore: string;
}>;

export type CreateAppointmentRequestFromEmailInput = {
  organizationId: string;
  message: NormalizedEmailMessage;
  intent: AppointmentIntent;
  conflictDetected?: boolean;
  conflictReason?: string | null;
  alternatives?: Json;
};

export type CreateEmailReplySuggestionInput = {
  organizationId: string;
  provider: EmailProvider;
  messageId: string;
  threadId?: string | null;
  subject: string;
  body: string;
  recipient: string;
  appointmentRequestId?: string | null;
  actionType?: EmailReplyActionType;
  rationale?: string | null;
  metadata?: Json;
};

export type UpsertConnectedWhatsAppAccountInput = {
  organizationId: string;
  businessAccountId?: string | null;
  phoneNumberId: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  accessTokenEncrypted?: string | null;
  webhookVerifyToken?: string | null;
  status?: ConnectedWhatsAppAccount["status"];
  ownerUserId?: string | null;
  metadata?: Json;
};

export type WhatsAppMessageFilters = Partial<{
  status: Database["public"]["Enums"]["message_status"];
  limit: number;
  receivedAfter: string;
  receivedBefore: string;
}>;

export type CreateAppointmentRequestFromWhatsAppInput = {
  organizationId: string;
  message: NormalizedWhatsAppMessage;
  intent: WhatsAppAppointmentIntent;
  conflictDetected?: boolean;
  conflictReason?: string | null;
  alternatives?: Json;
};

export type CreateWhatsAppReplySuggestionInput = {
  organizationId: string;
  provider: WhatsAppProvider;
  messageId: string;
  phoneNumberId: string;
  recipientPhone: string;
  body: string;
  appointmentRequestId?: string | null;
  actionType?: WhatsAppReplyActionType;
  rationale?: string | null;
  metadata?: Json;
};

export type SuggestedActionFilters = Partial<{
  statuses: ApprovalState[];
  actionTypes: SuggestedActionType[];
  limit: number;
}>;

export type ApprovalMutationInput = {
  organizationId: string;
  suggestedActionId: string;
  userId: string;
  note?: string | null;
};

export type EditSuggestedActionInput = ApprovalMutationInput & {
  draftPayload: Json;
  title?: string | null;
  rationale?: string | null;
};

export type CreateApprovalLogInput = {
  organizationId: string;
  suggestedActionId: string;
  userId: string | null;
  decision: ApprovalDecision;
  previousStatus: ApprovalState | null;
  newStatus: ApprovalState;
  previousPayload: Json;
  newPayload: Json;
  note?: string | null;
};

export type CreateAuditLogInput = {
  organizationId: string;
  userId: string | null;
  eventName: string;
  entityTable?: string | null;
  entityId?: string | null;
  metadata?: Json;
};

export type CreateExecutionRecordInput = {
  organizationId: string;
  suggestedActionId: string;
  userId: string | null;
  executionType: ExecutionType;
  status: ExecutionStatus;
  dryRun: boolean;
  provider?: string | null;
  requestPayload?: Json;
  responsePayload?: Json;
  errorMessage?: string | null;
  finalConfirmationText?: string | null;
};

export type ExecutionRecordFilters = Partial<{
  statuses: ExecutionStatus[];
  suggestedActionId: string;
  limit: number;
}>;

export type UpdateExecutionRecordStatusInput = {
  organizationId: string;
  executionRecordId: string;
  userId: string | null;
  status: ExecutionStatus;
  responsePayload?: Json;
  errorMessage?: string | null;
  executedAt?: string | null;
};

export type MarkSuggestedActionExecutionInput = {
  organizationId: string;
  suggestedActionId: string;
  userId: string | null;
  executionStatus: Extract<ExecutionStatus, "executed" | "failed">;
  errorMessage?: string | null;
};

export type CreateSyncLogInput = {
  organizationId: string;
  provider: SyncProvider;
  jobType: SyncJobType;
  status?: SyncStatus;
  startedAt?: string;
  recordsRead?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  errorMessage?: string | null;
  metadata?: Json;
};

export type UpdateSyncLogInput = {
  organizationId: string;
  syncLogId: string;
  status: SyncStatus;
  finishedAt?: string | null;
  recordsRead?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  errorMessage?: string | null;
  metadata?: Json;
};

export type SyncLogFilters = Partial<{
  providers: SyncProvider[];
  jobTypes: SyncJobType[];
  statuses: SyncStatus[];
  limit: number;
}>;

export type UpdateConnectedAccountTokensInput = {
  accountId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  expiresAt: string | null;
};

export type UpsertDailySummarySettingsInput = {
  organizationId: string;
  userId: string;
  enabled?: boolean;
  deliveryTime?: string;
  timezone?: string;
  includeCalendar?: boolean;
  includePendingApprovals?: boolean;
  includeUnhandledMessages?: boolean;
  includeFreeSlots?: boolean;
};

export type CreateDailySummaryInput = Omit<
  DailySummary,
  "id" | "createdAt" | "updatedAt" | "viewedAt"
> & {
  id?: string;
  viewedAt?: string | null;
};

export type EmergencyActionFilters = Partial<{
  statuses: EmergencyActionStatus[];
  targetDate: string;
  limit: number;
}>;

export type CreateEmergencyActionInput = {
  organizationId: string;
  createdBy: string;
  type: EmergencyActionType;
  status?: EmergencyActionStatus;
  reason: string;
  targetDate: string;
  delayMinutes?: number | null;
  messageTone?: EmergencyMessageTone;
  affectedEventsCount?: number;
  suggestedActionsCount?: number;
  metadata?: Json;
};

export type CreateRescheduleBatchInput = {
  organizationId: string;
  emergencyActionId: string;
  status?: EmergencyActionStatus;
  targetDate: string;
  affectedEventsCount: number;
};

export type CreateRescheduleProposalInput = {
  organizationId: string;
  emergencyActionId: string;
  rescheduleBatchId?: string | null;
  calendarEventId: string;
  contactId?: string | null;
  originalStartsAt: string;
  originalEndsAt: string;
  proposedStartsAt?: string | null;
  proposedEndsAt?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  preferredChannel: "email" | "whatsapp" | "manual_review";
  messageBody: string;
  status?: EmergencyActionStatus;
};

export type CreateEmergencySuggestedActionInput = EmergencySuggestedActionDraft & {
  organizationId: string;
  emergencyActionId: string;
  rescheduleProposalId?: string | null;
};

export type QuickCallNoteFilters = Partial<{
  statuses: QuickCallNoteStatus[];
  intentTypes: QuickCallIntentType[];
  createdBy: string;
  limit: number;
}>;

export type CreateQuickCallNoteInput = {
  organizationId: string;
  createdBy: string;
  rawText: string;
  status?: QuickCallNoteStatus;
};

export type UpdateQuickCallNoteAnalysisInput = {
  organizationId: string;
  callNoteId: string;
  analysis: QuickCallAnalysis;
  status?: QuickCallNoteStatus;
};

export type CreateAppointmentRequestFromCallNoteInput = {
  organizationId: string;
  callNote: QuickCallNote;
  analysis: QuickCallAnalysis;
  conflictDetected?: boolean;
  conflictReason?: string | null;
  alternatives?: AvailabilitySlot[] | Json;
};

export type CreateQuickCallSuggestedActionInput = QuickCallSuggestedActionDraft & {
  organizationId: string;
  callNoteId: string;
  appointmentRequestId?: string | null;
};

export type UpsertNotificationTokenInput = {
  organizationId: string;
  userId: string;
  expoPushToken: string;
  platform: "ios" | "android" | "web";
  deviceType?: DeviceType;
  smartwatchPlatform?: SmartwatchPlatform;
  capabilities?: DeviceCapability[];
  deviceName?: string | null;
  appVersion?: string | null;
  metadata?: Json;
};

export type UpsertRegisteredDeviceInput = {
  organizationId: string;
  userId: string;
  deviceType: DeviceType;
  platform?: SmartwatchPlatform;
  deviceName?: string | null;
  pushToken: string;
  capabilities?: DeviceCapability[];
  status?: RegisteredDevice["status"];
  appVersion?: string | null;
  notificationPlatform?: "ios" | "android" | "web";
  metadata?: Json;
};

export type UpdateDeviceCapabilitiesInput = {
  organizationId: string;
  userId: string;
  deviceId: string;
  capabilities: DeviceCapability[];
  deviceType?: DeviceType;
  platform?: SmartwatchPlatform;
};

export type UpsertNotificationPreferencesInput = {
  organizationId: string;
  userId: string;
  watchFriendlyNotificationsEnabled?: boolean;
  allowQuickApproveFromWatch?: boolean;
  allowQuickIgnoreFromWatch?: boolean;
  showDailySummaryOnWatch?: boolean;
  emergencyShortcutsOnWatch?: boolean;
};

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseRuntimeEnv = Partial<{
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
}>;

export function readSupabasePublicConfig(env: SupabaseRuntimeEnv): SupabasePublicConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase public config. Set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}

export function createSoreyaSupabaseClient(
  config: SupabasePublicConfig,
  options?: SupabaseClientOptions<"public">,
): SoreyaSupabaseClient {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    ...options,
  });
}

export function createSoreyaSupabaseClientFromEnv(
  env: SupabaseRuntimeEnv,
  options?: SupabaseClientOptions<"public">,
): SoreyaSupabaseClient {
  return createSoreyaSupabaseClient(readSupabasePublicConfig(env), options);
}

export async function getCurrentUser(client: SoreyaSupabaseClient): Promise<User | null> {
  const { data, error } = await client.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") {
      return null;
    }

    throw error;
  }

  return data.user;
}

export async function getUserOrganization(
  client: SoreyaSupabaseClient,
  userId?: string,
): Promise<UserOrganization | null> {
  const currentUser = userId ? null : await getCurrentUser(client);
  const resolvedUserId = userId ?? currentUser?.id;

  if (!resolvedUserId) {
    return null;
  }

  const { data: membership, error: membershipError } = await client
    .from("organization_members")
    .select("*")
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    return null;
  }

  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError) {
    throw organizationError;
  }

  return { organization, membership };
}

export async function createOrganizationForUser(
  client: SoreyaSupabaseClient,
  input: CreateOrganizationInput,
): Promise<UserOrganization> {
  const user = await getCurrentUser(client);

  if (!user) {
    throw new Error("Authentication required to create an organization.");
  }

  const name = input.name.trim();

  if (name.length < 2) {
    throw new Error("Organization name must be at least 2 characters.");
  }

  const slug = input.slug?.trim() || createOrganizationSlug(name);
  const timezone = input.timezone?.trim() || "Europe/Rome";

  const { error } = await client.rpc("create_organization_for_current_user", {
    organization_name: name,
    organization_slug: slug,
    organization_timezone: timezone,
  });

  if (error) {
    throw error;
  }

  const userOrganization = await getUserOrganization(client, user.id);

  if (!userOrganization) {
    throw new Error("Organization was created, but the owner membership was not found.");
  }

  return userOrganization;
}

export function createOrganizationSlug(name: string): string {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const slug = baseSlug || "organization";
  const suffix = Math.random().toString(36).slice(2, 8);

  return `${slug}-${suffix}`;
}

export async function getSuggestedActions(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: SuggestedActionFilters = {},
): Promise<SuggestedAction[]> {
  let query = client
    .from("suggested_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.statuses?.length) {
    query = query.in("status", filters.statuses);
  }

  if (filters.actionTypes?.length) {
    query = query.in("action_type", filters.actionTypes);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getSuggestedActionById(
  client: SoreyaSupabaseClient,
  organizationId: string,
  suggestedActionId: string,
): Promise<SuggestedAction | null> {
  const { data, error } = await client
    .from("suggested_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", suggestedActionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function approveSuggestedAction(
  client: SoreyaSupabaseClient,
  input: ApprovalMutationInput,
): Promise<SuggestedAction> {
  const action = await requireSuggestedActionForDecision(client, input.organizationId, input.suggestedActionId);

  if (!["pending_approval", "edited"].includes(action.status)) {
    throw new Error("Only pending_approval or edited actions can be approved.");
  }

  return updateSuggestedActionWithDecision(client, {
    action,
    decision: "approve",
    newStatus: "approved",
    userId: input.userId,
    note: input.note,
    update: {
      status: "approved",
      approved_by: input.userId,
      approved_at: new Date().toISOString(),
      failed_reason: null,
    },
  });
}

export async function editSuggestedAction(
  client: SoreyaSupabaseClient,
  input: EditSuggestedActionInput,
): Promise<SuggestedAction> {
  const action = await requireSuggestedActionForDecision(client, input.organizationId, input.suggestedActionId);

  if (!["pending_approval", "edited"].includes(action.status)) {
    throw new Error("Only pending_approval or edited actions can be edited.");
  }

  return updateSuggestedActionWithDecision(client, {
    action,
    decision: "edit",
    newStatus: "edited",
    userId: input.userId,
    note: input.note,
    newPayload: input.draftPayload,
    update: {
      status: "edited",
      title: input.title ?? action.title,
      rationale: input.rationale ?? action.rationale,
      draft_payload: input.draftPayload,
      approved_by: null,
      approved_at: null,
      failed_reason: null,
    },
  });
}

export async function rejectSuggestedAction(
  client: SoreyaSupabaseClient,
  input: ApprovalMutationInput,
): Promise<SuggestedAction> {
  const action = await requireSuggestedActionForDecision(client, input.organizationId, input.suggestedActionId);

  if (["executed", "failed", "ignored", "rejected"].includes(action.status)) {
    throw new Error("This action has already reached a terminal review state.");
  }

  return updateSuggestedActionWithDecision(client, {
    action,
    decision: "reject",
    newStatus: "rejected",
    userId: input.userId,
    note: input.note,
    update: {
      status: "rejected",
      approved_by: null,
      approved_at: null,
    },
  });
}

export async function ignoreSuggestedAction(
  client: SoreyaSupabaseClient,
  input: ApprovalMutationInput,
): Promise<SuggestedAction> {
  const action = await requireSuggestedActionForDecision(client, input.organizationId, input.suggestedActionId);

  if (["executed", "failed", "ignored", "rejected"].includes(action.status)) {
    throw new Error("This action has already reached a terminal review state.");
  }

  return updateSuggestedActionWithDecision(client, {
    action,
    decision: "ignore",
    newStatus: "ignored",
    userId: input.userId,
    note: input.note,
    update: {
      status: "ignored",
      approved_by: null,
      approved_at: null,
    },
  });
}

export async function createApprovalLog(
  client: SoreyaSupabaseClient,
  input: CreateApprovalLogInput,
): Promise<ApprovalLogRecord> {
  const { data, error } = await client
    .from("approval_logs")
    .insert({
      organization_id: input.organizationId,
      suggested_action_id: input.suggestedActionId,
      actor_user_id: input.userId,
      event: toApprovalLogEvent(input.decision),
      previous_status: input.previousStatus,
      next_status: input.newStatus,
      note: input.note ?? null,
      metadata: {
        decision: input.decision,
        previousPayload: input.previousPayload,
        newPayload: input.newPayload,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAuditLog(
  client: SoreyaSupabaseClient,
  input: CreateAuditLogInput,
): Promise<void> {
  const { error } = await client
    .from("audit_logs")
    .insert({
      organization_id: input.organizationId,
      actor_type: "user",
      actor_user_id: input.userId,
      event_name: input.eventName,
      entity_table: input.entityTable ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });

  if (error) {
    throw error;
  }
}

export async function createExecutionRecord(
  client: SoreyaSupabaseClient,
  input: CreateExecutionRecordInput,
): Promise<ExecutionRecord> {
  const { data, error } = await client
    .from("execution_records")
    .insert({
      organization_id: input.organizationId,
      suggested_action_id: input.suggestedActionId,
      executed_by: input.userId,
      execution_type: input.executionType,
      status: input.status,
      dry_run: input.dryRun,
      provider: input.provider ?? null,
      request_payload: input.requestPayload ?? {},
      response_payload: input.responsePayload ?? {},
      error_message: input.errorMessage ?? null,
      final_confirmation_text: input.finalConfirmationText ?? null,
      executed_at: input.status === "executed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventName: toExecutionAuditEvent(input.status),
    entityTable: "execution_records",
    entityId: data.id,
    metadata: {
      suggestedActionId: input.suggestedActionId,
      executionType: input.executionType,
      status: input.status,
      dryRun: input.dryRun,
      provider: input.provider ?? null,
      errorMessage: input.errorMessage ?? null,
    },
  });

  return toExecutionRecord(data);
}

export async function getExecutionRecordBySuggestedAction(
  client: SoreyaSupabaseClient,
  organizationId: string,
  suggestedActionId: string,
): Promise<ExecutionRecord | null> {
  const { data, error } = await client
    .from("execution_records")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("suggested_action_id", suggestedActionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toExecutionRecord(data) : null;
}

export async function getExecutionRecords(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: ExecutionRecordFilters = {},
): Promise<ExecutionRecord[]> {
  let query = client
    .from("execution_records")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.statuses?.length) {
    query = query.in("status", filters.statuses);
  }

  if (filters.suggestedActionId) {
    query = query.eq("suggested_action_id", filters.suggestedActionId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toExecutionRecord);
}

export async function updateExecutionRecordStatus(
  client: SoreyaSupabaseClient,
  input: UpdateExecutionRecordStatusInput,
): Promise<ExecutionRecord> {
  const { data, error } = await client
    .from("execution_records")
    .update({
      status: input.status,
      response_payload: input.responsePayload ?? {},
      error_message: input.errorMessage ?? null,
      executed_at: input.executedAt ?? (input.status === "executed" ? new Date().toISOString() : null),
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.executionRecordId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventName: toExecutionAuditEvent(input.status),
    entityTable: "execution_records",
    entityId: data.id,
    metadata: {
      suggestedActionId: data.suggested_action_id,
      executionType: data.execution_type,
      status: input.status,
      dryRun: data.dry_run,
      errorMessage: input.errorMessage ?? null,
    },
  });

  return toExecutionRecord(data);
}

export async function markSuggestedActionExecuted(
  client: SoreyaSupabaseClient,
  input: Omit<MarkSuggestedActionExecutionInput, "executionStatus">,
): Promise<SuggestedAction> {
  const { data, error } = await client
    .from("suggested_actions")
    .update({
      status: "executed",
      execution_status: "executed",
      executed_at: new Date().toISOString(),
      failed_reason: null,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.suggestedActionId)
    .eq("status", "approved")
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventName: "execution_executed",
    entityTable: "suggested_actions",
    entityId: input.suggestedActionId,
    metadata: {
      suggestedActionId: input.suggestedActionId,
      status: "executed",
    },
  });

  return data;
}

export async function markSuggestedActionFailed(
  client: SoreyaSupabaseClient,
  input: Omit<MarkSuggestedActionExecutionInput, "executionStatus">,
): Promise<SuggestedAction> {
  const { data, error } = await client
    .from("suggested_actions")
    .update({
      status: "failed",
      execution_status: "failed",
      failed_reason: input.errorMessage ?? "Execution failed.",
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.suggestedActionId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(client, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventName: "execution_failed",
    entityTable: "suggested_actions",
    entityId: input.suggestedActionId,
    metadata: {
      suggestedActionId: input.suggestedActionId,
      status: "failed",
      errorMessage: input.errorMessage ?? null,
    },
  });

  return data;
}

export async function getExecutableSuggestedAction(
  client: SoreyaSupabaseClient,
  organizationId: string,
  suggestedActionId: string,
): Promise<SuggestedAction> {
  const action = await getSuggestedActionById(client, organizationId, suggestedActionId);

  if (!action) {
    throw new Error("Suggested action not found.");
  }

  if (action.status !== "approved") {
    throw new Error("Only approved suggested actions can be executed.");
  }

  return action;
}

function isMissingSyncSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }

  if (error.code === "42P01" || error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST205") {
    return true;
  }

  const message = error.message ?? "";
  return (
    /does not exist/i.test(message) &&
    /(sync_logs|last_sync_status|last_sync_error|last_sync_at|provider)/i.test(message)
  );
}

export async function createSyncLog(
  client: SoreyaSupabaseClient,
  input: CreateSyncLogInput,
): Promise<SyncLog> {
  const { data, error } = await client
    .from("sync_logs")
    .insert({
      organization_id: input.organizationId,
      provider: input.provider,
      job_type: input.jobType,
      status: input.status ?? "running",
      started_at: input.startedAt ?? new Date().toISOString(),
      records_read: input.recordsRead ?? 0,
      records_created: input.recordsCreated ?? 0,
      records_updated: input.recordsUpdated ?? 0,
      records_skipped: input.recordsSkipped ?? 0,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toSyncLog(data);
}

export async function createSyncLogOptional(
  client: SoreyaSupabaseClient,
  input: CreateSyncLogInput,
): Promise<SyncLog | null> {
  try {
    return await createSyncLog(client, input);
  } catch (error) {
    if (isMissingSyncSchemaError(error as { code?: string; message?: string })) {
      return null;
    }

    throw error;
  }
}

export async function updateSyncLog(
  client: SoreyaSupabaseClient,
  input: UpdateSyncLogInput,
): Promise<SyncLog> {
  const { data, error } = await client
    .from("sync_logs")
    .update({
      status: input.status,
      finished_at: input.finishedAt === undefined ? new Date().toISOString() : input.finishedAt,
      records_read: input.recordsRead ?? 0,
      records_created: input.recordsCreated ?? 0,
      records_updated: input.recordsUpdated ?? 0,
      records_skipped: input.recordsSkipped ?? 0,
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.syncLogId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toSyncLog(data);
}

export async function getRecentSyncLogs(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: SyncLogFilters = {},
): Promise<SyncLog[]> {
  let query = client
    .from("sync_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 25);

  if (filters.providers?.length) {
    query = query.in("provider", filters.providers);
  }

  if (filters.jobTypes?.length) {
    query = query.in("job_type", filters.jobTypes);
  }

  if (filters.statuses?.length) {
    query = query.in("status", filters.statuses);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toSyncLog);
}

export async function updateConnectedAccountTokens(
  client: SoreyaSupabaseClient,
  input: UpdateConnectedAccountTokensInput,
): Promise<void> {
  const update: Database["public"]["Tables"]["connected_accounts"]["Update"] = {
    encrypted_access_token: input.accessTokenEncrypted,
    token_expires_at: input.expiresAt,
    last_token_refresh_at: new Date().toISOString(),
    status: "active",
    last_sync_error: null,
  };

  if (input.refreshTokenEncrypted !== undefined) {
    update.encrypted_refresh_token = input.refreshTokenEncrypted;
  }

  const { error } = await client
    .from("connected_accounts")
    .update(update)
    .eq("id", input.accountId);

  if (error) {
    throw error;
  }
}

export async function getAccountsNeedingRefresh(
  client: SoreyaSupabaseClient,
  organizationId?: string,
): Promise<Database["public"]["Tables"]["connected_accounts"]["Row"][]> {
  const refreshBefore = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  let query = client
    .from("connected_accounts")
    .select("*")
    .in("provider", ["google_calendar", "gmail", "microsoft_mail"])
    .not("encrypted_refresh_token", "is", null)
    .or(`token_expires_at.is.null,token_expires_at.lte.${refreshBefore}`);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function markAccountSyncStarted(
  client: SoreyaSupabaseClient,
  accountId: string,
): Promise<void> {
  const { error } = await client
    .from("connected_accounts")
    .update({
      last_sync_status: "running",
      last_sync_error: null,
    })
    .eq("id", accountId);

  if (error) {
    if (isMissingSyncSchemaError(error)) {
      return;
    }

    throw error;
  }
}

export async function markAccountSyncFinished(
  client: SoreyaSupabaseClient,
  accountId: string,
  status: SyncStatus,
  errorMessage?: string | null,
): Promise<void> {
  const update: Database["public"]["Tables"]["connected_accounts"]["Update"] = {
    last_sync_status: status,
    last_sync_error: errorMessage ?? null,
    last_sync_at: new Date().toISOString(),
  };

  if (status === "success" || status === "partial_success") {
    update.last_synced_at = update.last_sync_at;
    update.status = "active";
  }

  if (status === "failed") {
    update.status = "error";
  }

  const { error } = await client
    .from("connected_accounts")
    .update(update)
    .eq("id", accountId);

  if (error) {
    if (isMissingSyncSchemaError(error)) {
      const legacyUpdate: Database["public"]["Tables"]["connected_accounts"]["Update"] = {};

      if (status === "success" || status === "partial_success") {
        legacyUpdate.last_synced_at = update.last_sync_at;
        legacyUpdate.status = "active";
      }

      if (status === "failed") {
        legacyUpdate.status = "error";
      }

      const { error: legacyError } = await client
        .from("connected_accounts")
        .update(legacyUpdate)
        .eq("id", accountId);

      if (legacyError) {
        throw legacyError;
      }

      return;
    }

    throw error;
  }
}

export async function getDailySummarySettings(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<DailySummarySettings | null> {
  const { data, error } = await client
    .from("daily_summary_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toDailySummarySettings(data) : null;
}

export async function upsertDailySummarySettings(
  client: SoreyaSupabaseClient,
  input: UpsertDailySummarySettingsInput,
): Promise<DailySummarySettings> {
  const { data, error } = await client
    .from("daily_summary_settings")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        enabled: input.enabled ?? true,
        delivery_time: input.deliveryTime ?? "08:00",
        timezone: input.timezone ?? "Europe/Rome",
        channels: ["email", "whatsapp", "calendar"],
        include_calendar: input.includeCalendar ?? true,
        include_pending_approvals: input.includePendingApprovals ?? true,
        include_calendar_conflicts: input.includeCalendar ?? true,
        include_unanswered_messages: input.includeUnhandledMessages ?? true,
        include_free_slots: input.includeFreeSlots ?? true,
      },
      { onConflict: "organization_id,user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toDailySummarySettings(data);
}

export async function getDailySummary(
  client: SoreyaSupabaseClient,
  organizationId: string,
  summaryDate: string,
): Promise<DailySummary | null> {
  const { data, error } = await client
    .from("daily_summaries")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("summary_date", summaryDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toDailySummary(data) : null;
}

export async function createDailySummary(
  client: SoreyaSupabaseClient,
  input: CreateDailySummaryInput,
): Promise<DailySummary> {
  const { data, error } = await client
    .from("daily_summaries")
    .upsert(
      {
        organization_id: input.organizationId,
        summary_date: input.summaryDate,
        timezone: input.timezone,
        status: input.status,
        title: input.title,
        headline: input.headline,
        total_appointments: input.totalAppointments,
        first_appointment_at: input.firstAppointmentAt,
        last_appointment_at: input.lastAppointmentAt,
        pending_approvals_count: input.pendingApprovalsCount,
        conflicts_count: input.conflictsCount,
        unhandled_messages_count: input.unhandledMessagesCount,
        free_slots_count: input.freeSlotsCount,
        items: input.items as unknown as Json,
        recommendations: input.recommendations as unknown as Json,
        generated_at: input.generatedAt,
        viewed_at: input.viewedAt ?? null,
      },
      { onConflict: "organization_id,summary_date" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toDailySummary(data);
}

export async function markDailySummaryViewed(
  client: SoreyaSupabaseClient,
  organizationId: string,
  summaryId: string,
): Promise<DailySummary> {
  const { data, error } = await client
    .from("daily_summaries")
    .update({
      status: "viewed",
      viewed_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", summaryId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toDailySummary(data);
}

export async function getTodayCalendarEvents(
  client: SoreyaSupabaseClient,
  organizationId: string,
  timezone: string,
): Promise<NormalizedCalendarEvent[]> {
  const range = todayRange(timezone);
  return getCachedCalendarEvents(client, organizationId, range.start, range.end);
}

export async function getTodayPendingApprovals(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<SuggestedAction[]> {
  return getSuggestedActions(client, organizationId, {
    statuses: ["pending_approval", "edited"],
    limit: 50,
  });
}

export async function getTodayUnhandledMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<Database["public"]["Tables"]["incoming_messages"]["Row"][]> {
  const range = todayRange("Europe/Rome");
  const { data, error } = await client
    .from("incoming_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["received", "needs_review"])
    .gte("received_at", range.start)
    .lt("received_at", range.end)
    .order("received_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTodayAppointmentRequests(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<AppointmentRequest[]> {
  const range = todayRange("Europe/Rome");
  const { data, error } = await client
    .from("appointment_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createEmergencyAction(
  client: SoreyaSupabaseClient,
  input: CreateEmergencyActionInput,
): Promise<EmergencyAction> {
  const { data, error } = await client
    .from("emergency_actions")
    .insert({
      organization_id: input.organizationId,
      requested_by: input.createdBy,
      created_by: input.createdBy,
      action_type: input.type,
      status: input.status ?? "pending_approval",
      reason: input.reason,
      target_date: input.targetDate,
      delay_minutes: input.delayMinutes ?? null,
      message_tone: input.messageTone ?? "professional",
      affected_events_count: input.affectedEventsCount ?? 0,
      suggested_actions_count: input.suggestedActionsCount ?? 0,
      payload: input.metadata ?? {},
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(client, {
    organizationId: input.organizationId,
    userId: input.createdBy,
    eventName: "emergency_action_created",
    entityTable: "emergency_actions",
    entityId: data.id,
    metadata: {
      actionType: input.type,
      targetDate: input.targetDate,
      affectedEventsCount: input.affectedEventsCount ?? 0,
    },
  });

  return toEmergencyAction(data);
}

export async function getEmergencyActions(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: EmergencyActionFilters = {},
): Promise<EmergencyAction[]> {
  let query = client
    .from("emergency_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 20);

  if (filters.statuses?.length) {
    query = query.in("status", filters.statuses);
  }

  if (filters.targetDate) {
    query = query.eq("target_date", filters.targetDate);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toEmergencyAction);
}

export async function getEmergencyActionById(
  client: SoreyaSupabaseClient,
  organizationId: string,
  emergencyActionId: string,
): Promise<EmergencyAction | null> {
  const { data, error } = await client
    .from("emergency_actions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", emergencyActionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toEmergencyAction(data) : null;
}

export async function createRescheduleBatch(
  client: SoreyaSupabaseClient,
  input: CreateRescheduleBatchInput,
): Promise<RescheduleBatch> {
  const { data, error } = await client
    .from("reschedule_batches")
    .insert({
      organization_id: input.organizationId,
      emergency_action_id: input.emergencyActionId,
      status: input.status ?? "draft",
      target_date: input.targetDate,
      affected_events_count: input.affectedEventsCount,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toRescheduleBatch(data);
}

export async function createRescheduleProposals(
  client: SoreyaSupabaseClient,
  inputs: CreateRescheduleProposalInput[],
): Promise<RescheduleProposal[]> {
  if (inputs.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("reschedule_proposals")
    .insert(
      inputs.map((input) => ({
        organization_id: input.organizationId,
        emergency_action_id: input.emergencyActionId,
        reschedule_batch_id: input.rescheduleBatchId ?? null,
        calendar_event_id: input.calendarEventId,
        contact_id: input.contactId ?? null,
        original_starts_at: input.originalStartsAt,
        original_ends_at: input.originalEndsAt,
        proposed_starts_at: input.proposedStartsAt ?? null,
        proposed_ends_at: input.proposedEndsAt ?? null,
        recipient_name: input.recipientName ?? null,
        recipient_email: input.recipientEmail ?? null,
        recipient_phone: input.recipientPhone ?? null,
        preferred_channel: input.preferredChannel,
        message_body: input.messageBody,
        status: input.status ?? "draft",
      })),
    )
    .select("*");

  if (error) {
    throw error;
  }

  return (data ?? []).map(toRescheduleProposal);
}

export async function getEventsForEmergencyTarget(
  client: SoreyaSupabaseClient,
  organizationId: string,
  targetDate: string,
  targetWindow: EmergencyTargetWindow = "all_day",
): Promise<NormalizedCalendarEvent[]> {
  const { start, end } = emergencyTargetRange(targetDate, targetWindow);
  return getCachedCalendarEvents(client, organizationId, start, end);
}

export async function createEmergencySuggestedActions(
  client: SoreyaSupabaseClient,
  inputs: CreateEmergencySuggestedActionInput[],
): Promise<SuggestedAction[]> {
  if (inputs.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("suggested_actions")
    .insert(
      inputs.map((input) => ({
        organization_id: input.organizationId,
        emergency_action_id: input.emergencyActionId,
        reschedule_proposal_id: input.rescheduleProposalId ?? null,
        action_type: input.actionType,
        status: "pending_approval" as const,
        title: input.title,
        rationale: input.rationale,
        draft_payload: input.draftPayload,
        external_payload: {},
        risk_level: input.riskLevel,
        requires_approval: true,
        created_by_ai: true,
      })),
    )
    .select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updateEmergencyActionStatus(
  client: SoreyaSupabaseClient,
  organizationId: string,
  emergencyActionId: string,
  status: EmergencyActionStatus,
): Promise<EmergencyAction> {
  const { data, error } = await client
    .from("emergency_actions")
    .update({ status })
    .eq("organization_id", organizationId)
    .eq("id", emergencyActionId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toEmergencyAction(data);
}

export async function createQuickCallNote(
  client: SoreyaSupabaseClient,
  input: CreateQuickCallNoteInput,
): Promise<QuickCallNote> {
  const rawText = input.rawText.trim();

  if (!rawText) {
    throw new Error("Quick call note text is required.");
  }

  const { data, error } = await client
    .from("call_notes")
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      raw_text: rawText,
      status: input.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await createAuditLog(client, {
    organizationId: input.organizationId,
    userId: input.createdBy,
    eventName: "quick_call_note_created",
    entityTable: "call_notes",
    entityId: data.id,
    metadata: {
      rawTextLength: rawText.length,
    },
  });

  return toQuickCallNote(data);
}

export async function updateQuickCallNoteAnalysis(
  client: SoreyaSupabaseClient,
  input: UpdateQuickCallNoteAnalysisInput,
): Promise<QuickCallNote> {
  const { data, error } = await client
    .from("call_notes")
    .update({
      status: input.status ?? "analyzed",
      intent_type: input.analysis.intentType,
      confidence: input.analysis.confidence,
      customer_name: input.analysis.customerName,
      customer_email: input.analysis.customerEmail,
      customer_phone: input.analysis.customerPhone,
      requested_datetime_text: input.analysis.requestedDateTimeText,
      requested_start: input.analysis.requestedStartsAt,
      requested_end: input.analysis.requestedEndsAt,
      reason: input.analysis.reason,
      extracted_constraints: input.analysis.extractedConstraints,
      analysis: input.analysis as unknown as Json,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.callNoteId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toQuickCallNote(data);
}

export async function getQuickCallNotes(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: QuickCallNoteFilters = {},
): Promise<QuickCallNote[]> {
  let query = client
    .from("call_notes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 20);

  if (filters.statuses?.length) {
    query = query.in("status", filters.statuses);
  }

  if (filters.intentTypes?.length) {
    query = query.in("intent_type", filters.intentTypes);
  }

  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toQuickCallNote);
}

export async function getQuickCallNoteById(
  client: SoreyaSupabaseClient,
  organizationId: string,
  callNoteId: string,
): Promise<QuickCallNote | null> {
  const { data, error } = await client
    .from("call_notes")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", callNoteId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toQuickCallNote(data) : null;
}

export async function createAppointmentRequestFromCallNote(
  client: SoreyaSupabaseClient,
  input: CreateAppointmentRequestFromCallNoteInput,
): Promise<AppointmentRequest | null> {
  if (!["new_appointment", "reschedule_appointment", "cancel_appointment"].includes(input.analysis.intentType)) {
    return null;
  }

  const matchedServices = readMatchedServicesFromConstraints(input.analysis.extractedConstraints);
  const matchedService = matchedServices[0] ?? null;
  const { data, error } = await client
    .from("appointment_requests")
    .insert({
      organization_id: input.organizationId,
      incoming_message_id: null,
      call_note_id: input.callNote.id,
      service_id: matchedService?.id ?? null,
      source_channel: null,
      source_type: "quick_call",
      status: input.conflictDetected ? "conflict_detected" : "needs_review",
      title: input.analysis.reason ?? "Phone call appointment request",
      requested_start: input.analysis.requestedStartsAt,
      requested_end: input.analysis.requestedEndsAt,
      requested_timezone: null,
      duration_minutes: matchedServices.length > 0
        ? resolveCombinedServiceDurationMinutes(matchedServices)
        : null,
      confidence: input.analysis.confidence,
      conflict_detected: input.conflictDetected ?? false,
      conflict_reason: input.conflictReason ?? null,
      alternatives: input.alternatives ?? [],
      extracted_details: {
        source: "quick_call",
        callNoteId: input.callNote.id,
        customerName: input.analysis.customerName,
        customerEmail: input.analysis.customerEmail,
        customerPhone: input.analysis.customerPhone,
        requestedDateTimeText: input.analysis.requestedDateTimeText,
        reason: input.analysis.reason,
        needsMoreInfo: input.analysis.needsMoreInfo,
        missingFields: input.analysis.missingFields,
        extractedConstraints: input.analysis.extractedConstraints,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createQuickCallSuggestedActions(
  client: SoreyaSupabaseClient,
  inputs: CreateQuickCallSuggestedActionInput[],
): Promise<SuggestedAction[]> {
  if (inputs.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("suggested_actions")
    .insert(
      inputs.map((input) => ({
        organization_id: input.organizationId,
        appointment_request_id: input.appointmentRequestId ?? null,
        call_note_id: input.callNoteId,
        action_type: input.actionType,
        status: "pending_approval" as const,
        title: input.title,
        rationale: input.rationale,
        draft_payload: input.draftPayload,
        external_payload: {},
        risk_level: input.riskLevel,
        requires_approval: true,
        created_by_ai: true,
      })),
    )
    .select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function ignoreQuickCallNote(
  client: SoreyaSupabaseClient,
  organizationId: string,
  callNoteId: string,
): Promise<QuickCallNote> {
  const { data, error } = await client
    .from("call_notes")
    .update({ status: "ignored" })
    .eq("organization_id", organizationId)
    .eq("id", callNoteId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toQuickCallNote(data);
}

export async function upsertNotificationToken(
  client: SoreyaSupabaseClient,
  input: UpsertNotificationTokenInput,
): Promise<RegisteredNotificationToken> {
  const expoPushToken = input.expoPushToken.trim();

  if (!expoPushToken) {
    throw new Error("Expo push token is required.");
  }

  const { data, error } = await client
    .from("notification_tokens")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        platform: input.platform,
        device_type: input.deviceType ?? defaultDeviceTypeForNotificationPlatform(input.platform),
        smartwatch_platform: input.smartwatchPlatform ?? "unknown",
        token: expoPushToken,
        expo_push_token: expoPushToken,
        device_name: input.deviceName ?? null,
        app_version: input.appVersion ?? null,
        capabilities: input.capabilities ?? defaultCapabilitiesForDeviceType(defaultDeviceTypeForNotificationPlatform(input.platform)),
        status: "active",
        revoked_at: null,
        last_seen_at: new Date().toISOString(),
        metadata: input.metadata ?? {},
      },
      { onConflict: "expo_push_token" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toRegisteredNotificationToken(data);
}

export async function upsertRegisteredDevice(
  client: SoreyaSupabaseClient,
  input: UpsertRegisteredDeviceInput,
): Promise<RegisteredDevice> {
  const pushToken = input.pushToken.trim();

  if (!pushToken) {
    throw new Error("Push token is required.");
  }

  const notificationPlatform = input.notificationPlatform ?? defaultNotificationPlatformForDeviceType(input.deviceType);

  const { data, error } = await client
    .from("notification_tokens")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        platform: notificationPlatform,
        device_type: input.deviceType,
        smartwatch_platform: input.platform ?? "unknown",
        token: pushToken,
        expo_push_token: pushToken,
        device_name: input.deviceName ?? null,
        app_version: input.appVersion ?? null,
        capabilities: input.capabilities ?? defaultCapabilitiesForDeviceType(input.deviceType),
        status: input.status ?? "active",
        revoked_at: input.status === "revoked" ? new Date().toISOString() : null,
        last_seen_at: new Date().toISOString(),
        metadata: input.metadata ?? {},
      },
      { onConflict: "expo_push_token" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toRegisteredDevice(data);
}

export async function getNotificationTokensForUser(
  client: SoreyaSupabaseClient,
  organizationId: string,
  userId: string,
): Promise<RegisteredNotificationToken[]> {
  const { data, error } = await client
    .from("notification_tokens")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toRegisteredNotificationToken);
}

export async function getRegisteredDevicesForUser(
  client: SoreyaSupabaseClient,
  organizationId: string,
  userId: string,
): Promise<RegisteredDevice[]> {
  const { data, error } = await client
    .from("notification_tokens")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toRegisteredDevice);
}

export async function getSmartwatchCapableDevices(
  client: SoreyaSupabaseClient,
  organizationId: string,
  userId: string,
): Promise<RegisteredDevice[]> {
  const devices = await getRegisteredDevicesForUser(client, organizationId, userId);

  return devices.filter((device) =>
    device.status === "active"
    && hasSmartwatchCapability(device.capabilities),
  );
}

export async function getNotificationTokensForOrganization(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<RegisteredNotificationToken[]> {
  const { data, error } = await client
    .from("notification_tokens")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toRegisteredNotificationToken);
}

export async function disableNotificationToken(
  client: SoreyaSupabaseClient,
  tokenId: string,
): Promise<void> {
  const { error } = await client
    .from("notification_tokens")
    .update({
      status: "disabled",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", tokenId);

  if (error) {
    throw error;
  }
}

export async function updateDeviceCapabilities(
  client: SoreyaSupabaseClient,
  input: UpdateDeviceCapabilitiesInput,
): Promise<RegisteredDevice> {
  const update: Database["public"]["Tables"]["notification_tokens"]["Update"] = {
    capabilities: input.capabilities,
    last_seen_at: new Date().toISOString(),
  };

  if (input.deviceType) {
    update.device_type = input.deviceType;
  }

  if (input.platform) {
    update.smartwatch_platform = input.platform;
  }

  const { data, error } = await client
    .from("notification_tokens")
    .update(update)
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .eq("id", input.deviceId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toRegisteredDevice(data);
}

export async function touchNotificationToken(
  client: SoreyaSupabaseClient,
  token: string,
): Promise<void> {
  const { error } = await client
    .from("notification_tokens")
    .update({
      status: "active",
      revoked_at: null,
      last_seen_at: new Date().toISOString(),
    })
    .eq("expo_push_token", token);

  if (error) {
    throw error;
  }
}

export async function getNotificationPreferences(
  client: SoreyaSupabaseClient,
  organizationId: string,
  userId: string,
): Promise<NotificationPreferences | null> {
  const { data, error } = await client
    .from("notification_preferences")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toNotificationPreferences(data) : null;
}

export async function upsertNotificationPreferences(
  client: SoreyaSupabaseClient,
  input: UpsertNotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const { data, error } = await client
    .from("notification_preferences")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: input.userId,
        watch_friendly_notifications_enabled: input.watchFriendlyNotificationsEnabled ?? true,
        allow_quick_approve_from_watch: input.allowQuickApproveFromWatch ?? false,
        allow_quick_ignore_from_watch: input.allowQuickIgnoreFromWatch ?? false,
        show_daily_summary_on_watch: input.showDailySummaryOnWatch ?? true,
        emergency_shortcuts_on_watch: input.emergencyShortcutsOnWatch ?? false,
      },
      { onConflict: "organization_id,user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toNotificationPreferences(data);
}

export async function getConnectedCalendarAccounts(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<ConnectedCalendarAccount[]> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((row) => row.provider === "google_calendar" || row.provider === "microsoft_calendar")
    .map(toConnectedCalendarAccount);
}

function pickPreferredCalendarAccount(
  accounts: ConnectedCalendarAccount[],
  provider: CalendarProvider,
): ConnectedCalendarAccount | null {
  const matches = accounts.filter((account) => account.provider === provider);

  if (matches.length === 0) {
    return null;
  }

  const active = matches.filter((account) => account.status === "active");
  const pool = active.length > 0 ? active : matches;

  return [...pool].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )[0];
}

export async function getConnectedCalendarAccountByProvider(
  client: SoreyaSupabaseClient,
  organizationId: string,
  provider: CalendarProvider,
): Promise<ConnectedCalendarAccount | null> {
  const accounts = await getConnectedCalendarAccounts(client, organizationId);
  return pickPreferredCalendarAccount(accounts, provider);
}

export async function upsertConnectedCalendarAccount(
  client: SoreyaSupabaseClient,
  input: UpsertConnectedCalendarAccountInput,
): Promise<ConnectedCalendarAccount> {
  const { data, error } = await client
    .from("connected_accounts")
    .upsert(
      {
        organization_id: input.organizationId,
        owner_user_id: input.ownerUserId ?? null,
        provider: toCalendarAccountProvider(input.provider),
        provider_account_id: input.providerAccountId,
        display_name: input.displayName ?? null,
        email: input.email ?? null,
        status: input.status ?? "active",
        scopes: input.scopes ?? [],
        encrypted_access_token: input.accessTokenEncrypted ?? null,
        encrypted_refresh_token: input.refreshTokenEncrypted ?? null,
        token_expires_at: input.expiresAt ?? null,
        metadata: input.metadata ?? {},
        last_sync_error: null,
      },
      { onConflict: "organization_id,provider,provider_account_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const account = toConnectedCalendarAccount(data);

  await client
    .from("connected_accounts")
    .update({ status: "disabled" })
    .eq("organization_id", input.organizationId)
    .eq("provider", toCalendarAccountProvider(input.provider))
    .neq("id", account.id);

  return account;
}

export async function cacheCalendarEvents(
  client: SoreyaSupabaseClient,
  organizationId: string,
  accountId: string,
  events: NormalizedCalendarEvent[],
): Promise<number> {
  if (events.length === 0) {
    return 0;
  }

  const rows = events.map((event) => ({
    organization_id: organizationId,
    connected_account_id: accountId,
    provider: event.provider,
    external_event_id: event.providerEventId,
    calendar_id: event.calendarAccountId,
    title: event.title,
    description: event.description,
    location: event.location,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    timezone: event.timezone,
    status: event.status,
    attendees: event.attendees as unknown as Json,
    is_all_day: event.isAllDay,
    raw_event: event.raw,
    synced_at: new Date().toISOString(),
  }));

  let { error } = await client
    .from("calendar_events_cache")
    .upsert(rows, { onConflict: "organization_id,connected_account_id,external_event_id" });

  if (error && isMissingSyncSchemaError(error)) {
    const legacyRows = rows.map(({ provider: _provider, ...row }) => row);
    ({ error } = await client
      .from("calendar_events_cache")
      .upsert(legacyRows, { onConflict: "organization_id,connected_account_id,external_event_id" }));
  }

  if (error) {
    throw error;
  }

  return events.length;
}

export async function getCachedCalendarEvents(
  client: SoreyaSupabaseClient,
  organizationId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<NormalizedCalendarEvent[]> {
  const { data, error } = await client
    .from("calendar_events_cache")
    .select("*")
    .eq("organization_id", organizationId)
    .lt("starts_at", rangeEnd)
    .gt("ends_at", rangeStart)
    .order("starts_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toNormalizedCalendarEvent);
}

export async function markCalendarAccountSyncStatus(
  client: SoreyaSupabaseClient,
  accountId: string,
  status: ConnectedCalendarAccount["status"],
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

export async function getCalendarConnectionStatuses(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<CalendarConnectionStatus[]> {
  const accounts = await getConnectedCalendarAccounts(client, organizationId);

  return (["google", "microsoft"] as const).map((provider) => {
    const account = pickPreferredCalendarAccount(accounts, provider);

    return {
      provider,
      connected: Boolean(account && account.status === "active"),
      email: account?.email ?? null,
      status: account?.status ?? "not_connected",
      lastSyncedAt: account?.lastSyncedAt ?? null,
      lastSyncStatus: account?.lastSyncStatus ?? null,
      lastSyncError: account?.lastSyncError ?? null,
    };
  });
}

export async function createCalendarActionProposal(
  client: SoreyaSupabaseClient,
  input: CalendarActionProposalInput,
): Promise<SuggestedAction> {
  const payloadRecord = toJsonRecord(input.payload);

  const { data, error } = await client
    .from("suggested_actions")
    .insert({
      organization_id: input.organizationId,
      appointment_request_id: input.appointmentRequestId ?? null,
      action_type: input.actionType,
      status: "pending_approval",
      title: input.title ?? buildCalendarActionTitle(input.actionType),
      rationale: input.rationale ?? "Calendar operation proposal awaiting explicit user approval.",
      draft_payload: {
        provider: input.provider,
        ...payloadRecord,
      },
      external_payload: {},
      risk_level: input.riskLevel ?? "normal",
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

export async function getConnectedEmailAccounts(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<ConnectedEmailAccount[]> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .in("provider", ["gmail", "microsoft_mail"])
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toConnectedEmailAccount);
}

export async function getConnectedEmailAccountByProvider(
  client: SoreyaSupabaseClient,
  organizationId: string,
  provider: EmailProvider,
): Promise<ConnectedEmailAccount | null> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", toEmailAccountProvider(provider))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toConnectedEmailAccount(data) : null;
}

export async function upsertConnectedEmailAccount(
  client: SoreyaSupabaseClient,
  input: UpsertConnectedEmailAccountInput,
): Promise<ConnectedEmailAccount> {
  const { data, error } = await client
    .from("connected_accounts")
    .upsert(
      {
        organization_id: input.organizationId,
        owner_user_id: input.ownerUserId ?? null,
        provider: toEmailAccountProvider(input.provider),
        provider_account_id: input.providerAccountId,
        display_name: input.displayName ?? null,
        email: input.email ?? null,
        status: input.status ?? "active",
        scopes: input.scopes ?? [],
        encrypted_access_token: input.accessTokenEncrypted ?? null,
        encrypted_refresh_token: input.refreshTokenEncrypted ?? null,
        token_expires_at: input.expiresAt ?? null,
        metadata: input.metadata ?? {},
        last_sync_error: null,
      },
      { onConflict: "organization_id,provider,provider_account_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toConnectedEmailAccount(data);
}

export async function cacheIncomingEmailMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  accountId: string,
  messages: NormalizedEmailMessage[],
): Promise<number> {
  if (messages.length === 0) {
    return 0;
  }

  const rows = messages.map((message) => ({
    organization_id: organizationId,
    connected_account_id: accountId,
    provider_message_id: message.providerMessageId,
    thread_id: message.providerThreadId,
    email_provider: message.provider,
    from_email: message.fromEmail,
    from_name: message.fromName,
    to_emails: message.toEmails,
    cc_emails: message.ccEmails,
    direction: "incoming" as const,
    status: "classified" as const,
    subject: message.subject,
    snippet: message.snippet,
    body_text: message.bodyText,
    body_html: message.bodyHtml,
    has_attachments: message.hasAttachments,
    received_at: message.receivedAt,
    classified_at: new Date().toISOString(),
    ai_classification: {},
    attachments: [],
    metadata: {
      provider: message.provider,
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

export async function getCachedIncomingMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: IncomingMessageFilters = {},
): Promise<NormalizedEmailMessage[]> {
  let query = client
    .from("incoming_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .not("email_provider", "is", null)
    .order("received_at", { ascending: false })
    .limit(filters.limit ?? 25);

  if (filters.provider) {
    query = query.eq("email_provider", filters.provider);
  }

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

  return (data ?? []).map(toNormalizedEmailMessage);
}

export async function markEmailAccountSyncStatus(
  client: SoreyaSupabaseClient,
  accountId: string,
  status: ConnectedEmailAccount["status"],
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

export async function getEmailConnectionStatuses(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<EmailConnectionStatus[]> {
  const accounts = await getConnectedEmailAccounts(client, organizationId);

  return (["gmail", "microsoft"] as const).map((provider) => {
    const account = accounts.find((candidate) => candidate.provider === provider);

    return {
      provider,
      connected: Boolean(account && account.status === "active"),
      email: account?.email ?? null,
      status: account?.status ?? "not_connected",
      lastSyncedAt: account?.lastSyncedAt ?? null,
      lastSyncStatus: account?.lastSyncStatus ?? null,
      lastSyncError: account?.lastSyncError ?? null,
    };
  });
}

export async function createAppointmentRequestFromEmail(
  client: SoreyaSupabaseClient,
  input: CreateAppointmentRequestFromEmailInput,
): Promise<AppointmentRequest> {
  const { data: messageRow, error: messageError } = await client
    .from("incoming_messages")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("connected_account_id", input.message.emailAccountId)
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
      source_channel: "email",
      status: input.conflictDetected ? "conflict_detected" : "needs_review",
      title: input.message.subject ?? "Appointment request",
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
        customerEmail: input.intent.customerEmail,
        customerPhone: input.intent.customerPhone,
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

export async function createEmailReplySuggestion(
  client: SoreyaSupabaseClient,
  input: CreateEmailReplySuggestionInput,
): Promise<SuggestedAction> {
  const { data, error } = await client
    .from("suggested_actions")
    .insert({
      organization_id: input.organizationId,
      appointment_request_id: input.appointmentRequestId ?? null,
      action_type: input.actionType ?? "send_email_reply",
      status: "pending_approval",
      title: input.subject,
      rationale: input.rationale ?? "Email reply suggestion awaiting explicit user approval.",
      draft_payload: {
        provider: input.provider,
        messageId: input.messageId,
        threadId: input.threadId ?? null,
        subject: input.subject,
        body: input.body,
        recipient: input.recipient,
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

export async function getConnectedWhatsAppAccounts(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<ConnectedWhatsAppAccount[]> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .in("provider", ["whatsapp_business_cloud", "whatsapp_business"])
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toConnectedWhatsAppAccount);
}

export async function getConnectedWhatsAppAccount(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<ConnectedWhatsAppAccount | null> {
  const accounts = await getConnectedWhatsAppAccounts(client, organizationId);
  return accounts[0] ?? null;
}

export async function getConnectedWhatsAppAccountByPhoneNumberId(
  client: SoreyaSupabaseClient,
  phoneNumberId: string,
): Promise<ConnectedWhatsAppAccount | null> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("*")
    .in("provider", ["whatsapp_business_cloud", "whatsapp_business"])
    .eq("provider_account_id", phoneNumberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toConnectedWhatsAppAccount(data) : null;
}

export async function upsertConnectedWhatsAppAccount(
  client: SoreyaSupabaseClient,
  input: UpsertConnectedWhatsAppAccountInput,
): Promise<ConnectedWhatsAppAccount> {
  const metadata = mergeJsonObjects(input.metadata, {
    businessAccountId: input.businessAccountId ?? null,
    phoneNumberId: input.phoneNumberId,
    displayPhoneNumber: input.displayPhoneNumber ?? null,
    verifiedName: input.verifiedName ?? null,
    webhookVerifyToken: input.webhookVerifyToken ?? null,
  });

  const { data, error } = await client
    .from("connected_accounts")
    .upsert(
      {
        organization_id: input.organizationId,
        owner_user_id: input.ownerUserId ?? null,
        provider: "whatsapp_business_cloud",
        provider_account_id: input.phoneNumberId,
        display_name: input.verifiedName ?? input.displayPhoneNumber ?? null,
        email: null,
        status: input.status ?? "active",
        scopes: ["whatsapp_business_messaging", "whatsapp_business_management"],
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
        type: "whatsapp",
        external_id: input.phoneNumberId,
        name: input.verifiedName ?? input.displayPhoneNumber ?? "WhatsApp Business",
        address: input.displayPhoneNumber ?? input.phoneNumberId,
        status: input.status === "disabled" ? "disconnected" : "active",
        metadata: {
          provider: "whatsapp_business_cloud",
          businessAccountId: input.businessAccountId ?? null,
          phoneNumberId: input.phoneNumberId,
        },
      },
      { onConflict: "organization_id,type,external_id" },
    );

  if (channelError) {
    throw channelError;
  }

  return toConnectedWhatsAppAccount(data);
}

export async function cacheIncomingWhatsAppMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  accountId: string,
  messages: NormalizedWhatsAppMessage[],
): Promise<number> {
  if (messages.length === 0) {
    return 0;
  }

  const rows = messages.map((message) => ({
    organization_id: organizationId,
    connected_account_id: accountId,
    provider_message_id: message.providerMessageId,
    thread_id: message.providerThreadId,
    whatsapp_provider: message.provider,
    whatsapp_phone: message.fromPhone,
    whatsapp_message_type: message.messageType,
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
      toPhoneNumberId: message.toPhoneNumberId,
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

export async function getCachedWhatsAppMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: WhatsAppMessageFilters = {},
): Promise<NormalizedWhatsAppMessage[]> {
  let query = client
    .from("incoming_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .not("whatsapp_provider", "is", null)
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

  return (data ?? []).map(toNormalizedWhatsAppMessage);
}

export async function markWhatsAppAccountSyncStatus(
  client: SoreyaSupabaseClient,
  accountId: string,
  status: ConnectedWhatsAppAccount["status"],
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

export async function getWhatsAppConnectionStatus(
  client: SoreyaSupabaseClient,
  organizationId: string,
): Promise<WhatsAppConnectionStatus> {
  const account = await getConnectedWhatsAppAccount(client, organizationId);

  return {
    provider: "whatsapp_business_cloud",
    connected: Boolean(account && account.status === "active"),
    displayPhoneNumber: account?.displayPhoneNumber ?? account?.phoneNumberId ?? null,
    status: account?.status ?? "not_connected",
    lastSyncedAt: account?.lastSyncedAt ?? null,
    lastSyncStatus: account?.lastSyncStatus ?? null,
    lastSyncError: account?.lastSyncError ?? null,
  };
}

export async function createAppointmentRequestFromWhatsApp(
  client: SoreyaSupabaseClient,
  input: CreateAppointmentRequestFromWhatsAppInput,
): Promise<AppointmentRequest> {
  const { data: messageRow, error: messageError } = await client
    .from("incoming_messages")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("connected_account_id", input.message.whatsappAccountId)
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
      source_channel: "whatsapp",
      status: input.conflictDetected ? "conflict_detected" : "needs_review",
      title: input.intent.reason ?? "WhatsApp appointment request",
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
        customerPhone: input.intent.customerPhone ?? input.message.fromPhone,
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

export async function createWhatsAppReplySuggestion(
  client: SoreyaSupabaseClient,
  input: CreateWhatsAppReplySuggestionInput,
): Promise<SuggestedAction> {
  const { data, error } = await client
    .from("suggested_actions")
    .insert({
      organization_id: input.organizationId,
      appointment_request_id: input.appointmentRequestId ?? null,
      action_type: input.actionType ?? "send_whatsapp_reply",
      status: "pending_approval",
      title: input.actionType === "ask_whatsapp_more_info" ? "Ask WhatsApp more info" : "WhatsApp reply suggestion",
      rationale: input.rationale ?? "WhatsApp reply suggestion awaiting explicit user approval.",
      draft_payload: {
        provider: input.provider,
        messageId: input.messageId,
        phoneNumberId: input.phoneNumberId,
        recipientPhone: input.recipientPhone,
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

function toCalendarAccountProvider(provider: CalendarProvider): "google_calendar" | "microsoft_calendar" {
  return provider === "google" ? "google_calendar" : "microsoft_calendar";
}

function toEmailAccountProvider(provider: EmailProvider): "gmail" | "microsoft_mail" {
  return provider === "gmail" ? "gmail" : "microsoft_mail";
}

async function requireSuggestedActionForDecision(
  client: SoreyaSupabaseClient,
  organizationId: string,
  suggestedActionId: string,
): Promise<SuggestedAction> {
  const action = await getSuggestedActionById(client, organizationId, suggestedActionId);

  if (!action) {
    throw new Error("Suggested action not found.");
  }

  return action;
}

async function updateSuggestedActionWithDecision(
  client: SoreyaSupabaseClient,
  input: {
    action: SuggestedAction;
    decision: ApprovalDecision;
    newStatus: ApprovalState;
    userId: string;
    note?: string | null;
    newPayload?: Json;
    update: Database["public"]["Tables"]["suggested_actions"]["Update"];
  },
): Promise<SuggestedAction> {
  const previousPayload = input.action.draft_payload;
  const newPayload = input.newPayload ?? input.action.draft_payload;

  const { data, error } = await client
    .from("suggested_actions")
    .update(input.update)
    .eq("organization_id", input.action.organization_id)
    .eq("id", input.action.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await createApprovalLog(client, {
    organizationId: input.action.organization_id,
    suggestedActionId: input.action.id,
    userId: input.userId,
    decision: input.decision,
    previousStatus: input.action.status,
    newStatus: input.newStatus,
    previousPayload,
    newPayload,
    note: input.note,
  });

  await createAuditLog(client, {
    organizationId: input.action.organization_id,
    userId: input.userId,
    eventName: `suggested_action_${toAuditDecisionSuffix(input.decision)}`,
    entityTable: "suggested_actions",
    entityId: input.action.id,
    metadata: {
      actionType: input.action.action_type,
      previousStatus: input.action.status,
      newStatus: input.newStatus,
      decision: input.decision,
    },
  });

  return data;
}

function toApprovalLogEvent(decision: ApprovalDecision): ApprovalLogEvent {
  const events: Record<ApprovalDecision, ApprovalLogEvent> = {
    approve: "approved",
    edit: "edited",
    reject: "rejected",
    ignore: "ignored",
  };

  return events[decision];
}

function toAuditDecisionSuffix(decision: ApprovalDecision): string {
  const suffixes: Record<ApprovalDecision, string> = {
    approve: "approved",
    edit: "edited",
    reject: "rejected",
    ignore: "ignored",
  };

  return suffixes[decision];
}

function toExecutionAuditEvent(status: ExecutionStatus): string {
  const events: Record<ExecutionStatus, string> = {
    dry_run: "execution_dry_run",
    ready: "execution_previewed",
    executing: "execution_started",
    executed: "execution_executed",
    failed: "execution_failed",
    blocked: "execution_blocked",
    cancelled: "execution_cancelled",
  };

  return events[status];
}

function defaultDeviceTypeForNotificationPlatform(platform: "ios" | "android" | "web"): DeviceType {
  return platform === "web" ? "web" : "mobile";
}

function defaultNotificationPlatformForDeviceType(deviceType: DeviceType): "ios" | "android" | "web" {
  return deviceType === "web" ? "web" : "ios";
}

function defaultCapabilitiesForDeviceType(deviceType: DeviceType): DeviceCapability[] {
  if (deviceType === "web") {
    return ["push_notifications", "open_mobile_deeplink"];
  }

  return [
    "push_notifications",
    "actionable_notifications",
    "daily_summary_glance",
    "open_mobile_deeplink",
  ];
}

function hasSmartwatchCapability(capabilities: DeviceCapability[]): boolean {
  return capabilities.some((capability) =>
    [
      "actionable_notifications",
      "quick_approve",
      "quick_ignore",
      "emergency_shortcuts",
      "daily_summary_glance",
    ].includes(capability),
  );
}

function todayRange(timezone: string): { start: string; end: string } {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = new Date(`${dateKey}T00:00:00.000`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function emergencyTargetRange(targetDate: string, targetWindow: EmergencyTargetWindow): { start: string; end: string } {
  const start = new Date(`${targetDate}T00:00:00.000`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  if (targetWindow === "morning") {
    end.setHours(13, 0, 0, 0);
  }

  if (targetWindow === "afternoon") {
    start.setHours(13, 0, 0, 0);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function mergeJsonObjects(base: Json | undefined, override: Record<string, Json>): Json {
  return {
    ...(base && typeof base === "object" && !Array.isArray(base) ? base : {}),
    ...override,
  };
}

function readJsonMetadata(metadata: Json | undefined, key: string): Json {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata[key] ?? null;
}

function toJsonRecord(value: Json): Record<string, Json> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}

export async function getOrganizationBySlug(
  client: SoreyaSupabaseClient,
  slug: string,
) {
  const { data, error } = await client
    .from("organizations")
    .select("*")
    .eq("slug", slug.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOrganizationWebsiteFormSettings(
  client: SoreyaSupabaseClient,
  organizationId: string,
  patch: { enabled?: boolean; ingestToken?: string | null },
) {
  const { data: organization, error: readError } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (readError) {
    throw readError;
  }

  const settings = mergeWebsiteFormSettings(organization.settings, patch);
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
    websiteForm: parseWebsiteFormSettings(data.settings),
  };
}

export async function ensureWebsiteFormConnectedAccount(
  client: SoreyaSupabaseClient,
  organizationId: string,
) {
  const { data: existing, error: readError } = await client
    .from("connected_accounts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider", "website_form")
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await client
    .from("connected_accounts")
    .insert({
      organization_id: organizationId,
      provider: "website_form",
      provider_account_id: `website_form:${organizationId}`,
      display_name: "Website form",
      status: "active",
      metadata: { source: "website_form" },
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function cacheIncomingWebsiteFormMessage(
  client: SoreyaSupabaseClient,
  organizationId: string,
  accountId: string,
  message: NormalizedWebsiteFormMessage,
): Promise<void> {
  const { error } = await client
    .from("incoming_messages")
    .insert({
      organization_id: organizationId,
      connected_account_id: accountId,
      provider_message_id: message.providerMessageId,
      source_channel: "website_form",
      direction: "incoming",
      status: "classified",
      from_name: message.fromName,
      from_email: message.fromEmail,
      subject: message.subject,
      body_text: message.bodyText,
      received_at: message.receivedAt,
      classified_at: new Date().toISOString(),
      ai_classification: {},
      attachments: [],
      metadata: {
        source: "website_form",
        phone: message.fromPhone,
        pageUrl: message.pageUrl,
        formName: message.formName,
        raw: message.raw,
      },
    });

  if (error) {
    throw error;
  }
}

export async function getCachedWebsiteFormMessages(
  client: SoreyaSupabaseClient,
  organizationId: string,
  filters: IncomingMessageFilters = {},
): Promise<NormalizedWebsiteFormMessage[]> {
  let query = client
    .from("incoming_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("source_channel", "website_form")
    .order("received_at", { ascending: false })
    .limit(filters.limit ?? 25);

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

  return (data ?? []).map(toNormalizedWebsiteFormMessage);
}

function toNormalizedWebsiteFormMessage(
  row: Database["public"]["Tables"]["incoming_messages"]["Row"],
): NormalizedWebsiteFormMessage {
  const metadata = toJsonRecord(row.metadata);

  return {
    id: row.id,
    organizationId: row.organization_id,
    providerMessageId: row.provider_message_id ?? row.id,
    fromName: row.from_name,
    fromEmail: row.from_email,
    fromPhone: typeof metadata.phone === "string" ? metadata.phone : null,
    subject: row.subject,
    bodyText: row.body_text,
    receivedAt: row.received_at,
    pageUrl: typeof metadata.pageUrl === "string" ? metadata.pageUrl : null,
    formName: typeof metadata.formName === "string" ? metadata.formName : null,
    raw: metadata.raw ?? metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateOrganizationAddedChannels(
  client: SoreyaSupabaseClient,
  organizationId: string,
  addedChannels: SettingsChannelId[],
) {
  const { data: organization, error: readError } = await client
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (readError) {
    throw readError;
  }

  const settings = mergeAddedSettingsChannels(organization.settings, addedChannels);
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
    addedChannels: parseAddedSettingsChannels(data.settings),
  };
}

export * from "./website-chat";
export * from "./telegram";
export type { SyncLog } from "@soreya/shared";
export * from "./brain";

function buildCalendarActionTitle(actionType: CalendarActionType): string {
  const labels: Record<CalendarActionType, string> = {
    create_calendar_event: "Create calendar event",
    update_calendar_event: "Update calendar event",
    cancel_calendar_event: "Cancel calendar event",
    propose_alternative_slots: "Propose alternative slots",
  };

  return labels[actionType];
}
