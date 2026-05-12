export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export * from "./demo-data";
export * from "./demo-playground";
export * from "./i18n";

export type DateTime = string;
export type Time = string;
export type Uuid = string;

export type OrganizationRole = "owner" | "admin" | "member";
export type AccountProvider =
  | "gmail"
  | "google_calendar"
  | "microsoft_calendar"
  | "microsoft_mail"
  | "whatsapp_business"
  | "whatsapp_business_cloud";
export type CalendarProvider = "google" | "microsoft";
export type EmailProvider = "gmail" | "microsoft";
export type WhatsAppProvider = "whatsapp_business_cloud";
export type ConnectedAccountStatus = "active" | "reauth_required" | "disabled" | "error";
export type CommunicationChannelType = "email" | "whatsapp" | "calendar";
export type CommunicationChannelStatus = "active" | "paused" | "disconnected";
export type AIAnalysisSource = "email" | "whatsapp" | "quick_call" | "emergency";
export type AIProvider = "openai" | "heuristic";
export type AIReplyChannel = "email" | "whatsapp" | "calendar" | "manual_review";
export type NotificationTokenStatus = "active" | "disabled" | "revoked";
export type DeviceType = "web" | "mobile" | "smartwatch";
export type SmartwatchPlatform = "apple_watch" | "wear_os" | "unknown";
export const deviceCapabilities = [
  "push_notifications",
  "actionable_notifications",
  "quick_approve",
  "quick_ignore",
  "emergency_shortcuts",
  "daily_summary_glance",
  "open_mobile_deeplink",
] as const;
export type DeviceCapability = (typeof deviceCapabilities)[number];
export type SmartwatchActionType =
  | "quick_approve"
  | "quick_ignore"
  | "open_mobile"
  | "emergency_delay"
  | "emergency_reschedule_today"
  | "view_daily_summary";
export type NotificationType =
  | "pending_approval"
  | "daily_summary_ready"
  | "emergency_actions_created"
  | "appointment_request_detected"
  | "quick_call_created"
  | "system";
export type ExecutionStatus =
  | "dry_run"
  | "ready"
  | "executing"
  | "executed"
  | "failed"
  | "blocked"
  | "cancelled";
export type ExecutionType =
  | "email_reply"
  | "whatsapp_reply"
  | "calendar_create"
  | "calendar_update"
  | "calendar_cancel"
  | "emergency_email"
  | "emergency_whatsapp"
  | "calendar_block"
  | "callback_reminder";
export type SyncProvider = "google_calendar" | "microsoft_calendar" | "gmail" | "microsoft_mail" | "whatsapp";
export type SyncStatus = "queued" | "running" | "success" | "partial_success" | "failed" | "skipped";
export type SyncJobType =
  | "calendar_sync"
  | "email_sync"
  | "whatsapp_webhook"
  | "daily_summary_generate"
  | "full_sync";
export type MessageDirection = "incoming" | "outgoing";
export type MessageStatus = "received" | "classified" | "needs_review" | "archived";
export type AppointmentRequestStatus =
  | "needs_review"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "cancelled"
  | "conflict_detected";
export type SuggestedActionType =
  | "send_email"
  | "send_whatsapp"
  | "create_calendar_event"
  | "update_calendar_event"
  | "delete_calendar_event"
  | "cancel_calendar_event"
  | "propose_alternative_slots"
  | "send_email_reply"
  | "create_email_draft"
  | "ask_email_more_info"
  | "send_whatsapp_reply"
  | "ask_whatsapp_more_info"
  | "send_emergency_email"
  | "send_emergency_whatsapp"
  | "propose_calendar_reschedule"
  | "block_calendar_day"
  | "notify_delay_email"
  | "notify_delay_whatsapp"
  | "create_calendar_event_from_call"
  | "update_calendar_event_from_call"
  | "cancel_calendar_event_from_call"
  | "send_call_followup_email"
  | "send_call_followup_whatsapp"
  | "request_call_more_info"
  | "callback_reminder"
  | "request_more_information"
  | "escalate_to_user"
  | "manual_review"
  | "daily_summary";
export type ApprovalState =
  | "pending_approval"
  | "edited"
  | "approved"
  | "rejected"
  | "ignored"
  | "executed"
  | "cancelled"
  | "expired"
  | "failed";
export type ApprovalLogEvent =
  | "created"
  | "edited"
  | "approved"
  | "rejected"
  | "ignored"
  | "executed"
  | "cancelled"
  | "expired"
  | "failed";
export type SuggestedActionStatus =
  | "pending_approval"
  | "edited"
  | "approved"
  | "rejected"
  | "ignored"
  | "executed"
  | "failed";
export type ApprovalDecision = "approve" | "edit" | "reject" | "ignore";
export type DailySummaryStatus = "generated" | "viewed" | "dismissed" | "failed";
export type DailySummaryItemType =
  | "appointment"
  | "conflict"
  | "pending_approval"
  | "unhandled_message"
  | "free_slot"
  | "recommendation";
export type EmergencyActionType =
  | "pause_automation"
  | "disconnect_channel"
  | "block_contact"
  | "notify_owner"
  | "lock_external_sends"
  | "reschedule_all_today"
  | "reschedule_morning"
  | "reschedule_afternoon"
  | "notify_delay"
  | "block_today"
  | "notify_all_today";
export type EmergencyActionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "cancelled"
  | "completed";
export type QuickCallNoteStatus =
  | "draft"
  | "analyzed"
  | "pending_approval"
  | "completed"
  | "ignored"
  | "failed";
export type QuickCallIntentType =
  | "new_appointment"
  | "reschedule_appointment"
  | "cancel_appointment"
  | "callback_request"
  | "generic_note"
  | "unknown";
export type EmergencyMessageTone = "professional" | "friendly" | "short" | "apologetic";
export type EmergencyTargetWindow = "all_day" | "morning" | "afternoon";
export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";
export type AuditActorType = "user" | "ai" | "system" | "integration";
export type UserRuleScope =
  | "all_channels"
  | "email"
  | "whatsapp"
  | "calendar"
  | "contact"
  | "organization";

export const externalActionTypes = [
  "send_email",
  "send_whatsapp",
  "create_calendar_event",
  "update_calendar_event",
  "delete_calendar_event",
  "cancel_calendar_event",
  "send_email_reply",
  "create_email_draft",
  "ask_email_more_info",
  "send_whatsapp_reply",
  "ask_whatsapp_more_info",
  "send_emergency_email",
  "send_emergency_whatsapp",
  "propose_calendar_reschedule",
  "block_calendar_day",
  "notify_delay_email",
  "notify_delay_whatsapp",
  "create_calendar_event_from_call",
  "update_calendar_event_from_call",
  "cancel_calendar_event_from_call",
  "send_call_followup_email",
  "send_call_followup_whatsapp",
  "request_call_more_info",
  "callback_reminder",
] as const satisfies readonly SuggestedActionType[];

export type CalendarAttendee = {
  email: string | null;
  displayName: string | null;
  responseStatus: string | null;
  optional?: boolean;
};

export type ConnectedCalendarAccount = {
  id: Uuid;
  organizationId: Uuid;
  provider: CalendarProvider;
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  expiresAt: DateTime | null;
  scopes: string[];
  status: ConnectedAccountStatus;
  lastSyncedAt: DateTime | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncError: string | null;
  lastTokenRefreshAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type NormalizedCalendarEvent = {
  id: Uuid;
  organizationId: Uuid;
  provider: CalendarProvider;
  providerEventId: string;
  calendarAccountId: Uuid;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: DateTime;
  endsAt: DateTime;
  timezone: string | null;
  isAllDay: boolean;
  attendees: CalendarAttendee[];
  status: CalendarEventStatus;
  raw: Json;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type AvailabilitySlot = {
  startsAt: DateTime;
  endsAt: DateTime;
  durationMinutes: number;
  provider: CalendarProvider | "all";
  calendarAccountId: Uuid | null;
};

export type CalendarConflict = {
  requestedStartsAt: DateTime;
  requestedEndsAt: DateTime;
  conflictingEvents: NormalizedCalendarEvent[];
  alternatives: AvailabilitySlot[];
};

export type CalendarConnectionStatus = {
  provider: CalendarProvider;
  connected: boolean;
  email: string | null;
  status: ConnectedAccountStatus | "not_connected";
  lastSyncedAt: DateTime | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncError: string | null;
};

export type CalendarActionType =
  | "create_calendar_event"
  | "update_calendar_event"
  | "cancel_calendar_event"
  | "propose_alternative_slots";

export type CalendarAvailabilityRules = {
  timezone?: string;
  durationMinutes?: number;
  workingHours?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  bufferMinutes?: number;
};

export type AIModelMetadata = {
  aiProvider: AIProvider;
  aiModel: string | null;
  usedFallback: boolean;
};

export type AIAppointmentAnalysis = AIModelMetadata & {
  isAppointmentRequest: boolean;
  intentType: string;
  confidence: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  requestedDateTimeText: string | null;
  requestedStartsAt: DateTime | null;
  requestedEndsAt: DateTime | null;
  timezone: string | null;
  reason: string | null;
  needsMoreInfo: boolean;
  missingFields: string[];
  extractedConstraints: Json;
  priority: "low" | "normal" | "high";
  suggestedReplyTone: "professional" | "friendly" | "short" | "apologetic";
  suggestedReplyBody: string | null;
  safetyNotes: string[];
};

export type AIReplyDraft = AIModelMetadata & {
  channel: AIReplyChannel;
  recipient: string | null;
  subject: string | null;
  body: string;
  tone: "professional" | "friendly" | "short" | "apologetic";
  needsApproval: boolean;
  safetyNotes: string[];
};

export type ConnectedEmailAccount = {
  id: Uuid;
  organizationId: Uuid;
  provider: EmailProvider;
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  expiresAt: DateTime | null;
  scopes: string[];
  status: ConnectedAccountStatus;
  lastSyncedAt: DateTime | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncError: string | null;
  lastTokenRefreshAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type NormalizedEmailMessage = {
  id: Uuid;
  organizationId: Uuid;
  provider: EmailProvider;
  providerMessageId: string;
  providerThreadId: string | null;
  emailAccountId: Uuid;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: DateTime;
  hasAttachments: boolean;
  raw: Json;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type AppointmentIntent = {
  isAppointmentRequest: boolean;
  intentType?: string;
  confidence: number;
  requestedDateTimeText: string | null;
  requestedStartsAt: DateTime | null;
  requestedEndsAt: DateTime | null;
  timezone: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  reason: string | null;
  needsMoreInfo: boolean;
  missingFields?: string[];
  extractedConstraints: Json;
  priority?: "low" | "normal" | "high";
  suggestedReplyTone?: "professional" | "friendly" | "short" | "apologetic";
  suggestedReplyBody?: string | null;
  safetyNotes?: string[];
  aiProvider?: AIProvider;
  aiModel?: string | null;
  usedFallback?: boolean;
};

export type EmailConnectionStatus = {
  provider: EmailProvider;
  connected: boolean;
  email: string | null;
  status: ConnectedAccountStatus | "not_connected";
  lastSyncedAt: DateTime | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncError: string | null;
};

export type EmailReplyActionType = "send_email_reply" | "create_email_draft" | "ask_email_more_info";

export type ConnectedWhatsAppAccount = {
  id: Uuid;
  organizationId: Uuid;
  provider: WhatsAppProvider;
  businessAccountId: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  accessTokenEncrypted: string | null;
  webhookVerifyToken: string | null;
  status: ConnectedAccountStatus;
  lastSyncedAt: DateTime | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncError: string | null;
  lastTokenRefreshAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type NormalizedWhatsAppMessage = {
  id: Uuid;
  organizationId: Uuid;
  provider: WhatsAppProvider;
  providerMessageId: string;
  providerThreadId: string | null;
  whatsappAccountId: Uuid;
  fromPhone: string | null;
  fromName: string | null;
  toPhoneNumberId: string | null;
  messageType: string;
  textBody: string | null;
  receivedAt: DateTime;
  raw: Json;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type WhatsAppAppointmentIntent = {
  isAppointmentRequest: boolean;
  intentType?: string;
  confidence: number;
  requestedDateTimeText: string | null;
  requestedStartsAt: DateTime | null;
  requestedEndsAt: DateTime | null;
  timezone: string | null;
  customerName: string | null;
  customerPhone: string | null;
  reason: string | null;
  needsMoreInfo: boolean;
  missingFields?: string[];
  extractedConstraints: Json;
  priority?: "low" | "normal" | "high";
  suggestedReplyTone?: "professional" | "friendly" | "short" | "apologetic";
  suggestedReplyBody?: string | null;
  safetyNotes?: string[];
  aiProvider?: AIProvider;
  aiModel?: string | null;
  usedFallback?: boolean;
};

export type WhatsAppConnectionStatus = {
  provider: WhatsAppProvider;
  connected: boolean;
  displayPhoneNumber: string | null;
  status: ConnectedAccountStatus | "not_connected";
  lastSyncedAt: DateTime | null;
  lastSyncStatus: SyncStatus | null;
  lastSyncError: string | null;
};

export type WhatsAppReplyActionType = "send_whatsapp_reply" | "ask_whatsapp_more_info";

export type ApprovalLog = {
  id: Uuid;
  organizationId: Uuid;
  suggestedActionId: Uuid;
  userId: Uuid | null;
  decision: ApprovalDecision;
  previousStatus: ApprovalState | null;
  newStatus: ApprovalState | null;
  previousPayload: Json;
  newPayload: Json;
  note: string | null;
  createdAt: DateTime;
};

export type DailySummaryItem = {
  id: Uuid | string;
  type: DailySummaryItemType;
  title: string;
  description: string | null;
  startsAt: DateTime | null;
  endsAt: DateTime | null;
  priority: "low" | "normal" | "high";
  relatedEntityType: string | null;
  relatedEntityId: Uuid | string | null;
  actionLabel: string | null;
};

export type DailySummary = {
  id: Uuid;
  organizationId: Uuid;
  summaryDate: string;
  timezone: string;
  status: DailySummaryStatus;
  title: string;
  headline: string;
  totalAppointments: number;
  firstAppointmentAt: DateTime | null;
  lastAppointmentAt: DateTime | null;
  pendingApprovalsCount: number;
  conflictsCount: number;
  unhandledMessagesCount: number;
  freeSlotsCount: number;
  items: DailySummaryItem[];
  recommendations: DailySummaryItem[];
  generatedAt: DateTime;
  viewedAt: DateTime | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type DailySummarySettings = {
  organizationId: Uuid;
  enabled: boolean;
  deliveryTime: Time;
  timezone: string;
  includeCalendar: boolean;
  includePendingApprovals: boolean;
  includeUnhandledMessages: boolean;
  includeFreeSlots: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type EmergencyAction = {
  id: Uuid;
  organizationId: Uuid;
  createdBy: Uuid | null;
  type: EmergencyActionType;
  status: EmergencyActionStatus;
  reason: string;
  targetDate: string;
  delayMinutes: number | null;
  messageTone: EmergencyMessageTone;
  affectedEventsCount: number;
  suggestedActionsCount: number;
  metadata: Json;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type RescheduleBatch = {
  id: Uuid;
  organizationId: Uuid;
  emergencyActionId: Uuid;
  status: EmergencyActionStatus;
  targetDate: string;
  affectedEventsCount: number;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type RescheduleProposal = {
  id: Uuid;
  organizationId: Uuid;
  emergencyActionId: Uuid;
  rescheduleBatchId: Uuid | null;
  calendarEventId: Uuid;
  contactId: Uuid | null;
  originalStartsAt: DateTime;
  originalEndsAt: DateTime;
  proposedStartsAt: DateTime | null;
  proposedEndsAt: DateTime | null;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  preferredChannel: "email" | "whatsapp" | "manual_review";
  messageBody: string;
  status: EmergencyActionStatus;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type EmergencyModeRequest = {
  type: EmergencyActionType;
  targetDate: string;
  reason: string;
  delayMinutes?: number | null;
  messageTone?: EmergencyMessageTone;
  targetWindow?: EmergencyTargetWindow;
  customMessage?: string | null;
};

export type EmergencySuggestedActionDraft = {
  actionType: SuggestedActionType;
  title: string;
  rationale: string | null;
  draftPayload: Json;
  riskLevel: "low" | "normal" | "high" | "critical";
  relatedProposalId?: string | null;
};

export type EmergencyModeSuggestedAction = EmergencySuggestedActionDraft | SuggestedAction;

export type EmergencyModeResult = {
  emergencyAction: EmergencyAction | null;
  affectedEvents: NormalizedCalendarEvent[];
  proposals: RescheduleProposal[];
  suggestedActions: EmergencyModeSuggestedAction[];
  warnings: string[];
};

export type QuickCallNote = {
  id: Uuid;
  organizationId: Uuid;
  createdBy: Uuid | null;
  rawText: string;
  status: QuickCallNoteStatus;
  intentType: QuickCallIntentType;
  confidence: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  requestedDateTimeText: string | null;
  requestedStartsAt: DateTime | null;
  requestedEndsAt: DateTime | null;
  reason: string | null;
  extractedConstraints: Json;
  analysis: Json;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type QuickCallAnalysis = {
  intentType: QuickCallIntentType;
  confidence: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  requestedDateTimeText: string | null;
  requestedStartsAt: DateTime | null;
  requestedEndsAt: DateTime | null;
  reason: string | null;
  needsMoreInfo: boolean;
  missingFields: string[];
  extractedConstraints: Json;
  suggestedReplyChannel: "email" | "whatsapp" | "manual_review";
  suggestedReplyBody: string | null;
  priority?: "low" | "normal" | "high";
  suggestedReplyTone?: "professional" | "friendly" | "short" | "apologetic";
  safetyNotes?: string[];
  aiProvider?: AIProvider;
  aiModel?: string | null;
  usedFallback?: boolean;
};

export type QuickCallSuggestedActionDraft = {
  actionType: SuggestedActionType;
  title: string;
  rationale: string | null;
  draftPayload: Json;
  riskLevel: "low" | "normal" | "high" | "critical";
};

export type QuickCallSuggestedAction = QuickCallSuggestedActionDraft | SuggestedAction;

export type QuickCallResult = {
  callNote: QuickCallNote | null;
  appointmentRequest: AppointmentRequest | null;
  suggestedActions: QuickCallSuggestedAction[];
  warnings: string[];
  alternatives: AvailabilitySlot[];
};

export const approvalTerminalStates = [
  "executed",
  "rejected",
  "ignored",
  "cancelled",
  "expired",
  "failed",
] as const satisfies readonly ApprovalState[];

export type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type InsertShape<Row, RequiredKeys extends keyof Row = never> = Partial<Row> &
  Pick<Row, RequiredKeys>;
export type UpdateShape<Row> = Partial<Row>;

export type OrganizationRow = {
  id: Uuid;
  name: string;
  slug: string;
  default_timezone: string;
  settings: Json;
  created_at: DateTime;
  updated_at: DateTime;
};

export type OrganizationMemberRow = {
  id: Uuid;
  organization_id: Uuid;
  user_id: Uuid;
  role: OrganizationRole;
  invited_email: string | null;
  joined_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
};

export type ConnectedAccountRow = {
  id: Uuid;
  organization_id: Uuid;
  owner_user_id: Uuid | null;
  provider: AccountProvider;
  provider_account_id: string;
  display_name: string | null;
  email: string | null;
  status: ConnectedAccountStatus;
  scopes: string[];
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  token_expires_at: DateTime | null;
  last_token_refresh_at: DateTime | null;
  last_sync_at: DateTime | null;
  last_sync_status: SyncStatus | null;
  last_synced_at: DateTime | null;
  metadata: Json;
  last_sync_error: string | null;
  created_at: DateTime;
  updated_at: DateTime;
};

export type CommunicationChannelRow = {
  id: Uuid;
  organization_id: Uuid;
  connected_account_id: Uuid | null;
  type: CommunicationChannelType;
  external_id: string | null;
  name: string;
  address: string | null;
  status: CommunicationChannelStatus;
  is_primary: boolean;
  sync_cursor: string | null;
  last_message_at: DateTime | null;
  metadata: Json;
  created_at: DateTime;
  updated_at: DateTime;
};

export type ContactRow = {
  id: Uuid;
  organization_id: Uuid;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_id: string | null;
  timezone: string | null;
  notes: string | null;
  ai_context: Json;
  last_contacted_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
};

export type IncomingMessageRow = {
  id: Uuid;
  organization_id: Uuid;
  channel_id: Uuid | null;
  contact_id: Uuid | null;
  connected_account_id: Uuid | null;
  provider_message_id: string | null;
  thread_id: string | null;
  email_provider: EmailProvider | null;
  whatsapp_provider: WhatsAppProvider | null;
  whatsapp_phone: string | null;
  whatsapp_message_type: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  direction: MessageDirection;
  status: MessageStatus;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  has_attachments: boolean;
  received_at: DateTime;
  classified_at: DateTime | null;
  ai_classification: Json;
  attachments: Json;
  metadata: Json;
  created_at: DateTime;
  updated_at: DateTime;
};

export type AppointmentRequestRow = {
  id: Uuid;
  organization_id: Uuid;
  incoming_message_id: Uuid | null;
  call_note_id: Uuid | null;
  contact_id: Uuid | null;
  source_channel: CommunicationChannelType | null;
  source_type: "email" | "whatsapp" | "calendar" | "quick_call" | "manual" | null;
  status: AppointmentRequestStatus;
  title: string | null;
  requested_start: DateTime | null;
  requested_end: DateTime | null;
  requested_timezone: string | null;
  duration_minutes: number | null;
  location: string | null;
  meeting_type: string | null;
  confidence: number;
  conflict_detected: boolean;
  conflict_reason: string | null;
  alternatives: Json;
  extracted_details: Json;
  created_at: DateTime;
  updated_at: DateTime;
};

export type SuggestedActionRow = {
  id: Uuid;
  organization_id: Uuid;
  appointment_request_id: Uuid | null;
  emergency_action_id: Uuid | null;
  reschedule_proposal_id: Uuid | null;
  call_note_id: Uuid | null;
  incoming_message_id: Uuid | null;
  contact_id: Uuid | null;
  action_type: SuggestedActionType;
  status: ApprovalState;
  title: string;
  rationale: string | null;
  draft_payload: Json;
  external_payload: Json;
  risk_level: "low" | "normal" | "high" | "critical";
  requires_approval: boolean;
  approved_by: Uuid | null;
  approved_at: DateTime | null;
  execution_status: ExecutionStatus | null;
  executed_at: DateTime | null;
  failed_reason: string | null;
  expires_at: DateTime | null;
  created_by_ai: boolean;
  created_at: DateTime;
  updated_at: DateTime;
};

export type EmergencyActionRow = {
  id: Uuid;
  organization_id: Uuid;
  requested_by: Uuid | null;
  created_by: Uuid | null;
  action_type: EmergencyActionType;
  status: EmergencyActionStatus;
  reason: string;
  target_date: string;
  delay_minutes: number | null;
  message_tone: EmergencyMessageTone;
  affected_events_count: number;
  suggested_actions_count: number;
  target_channel_id: Uuid | null;
  target_contact_id: Uuid | null;
  payload: Json;
  metadata: Json;
  approved_by: Uuid | null;
  approved_at: DateTime | null;
  executed_at: DateTime | null;
  expires_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
};

export type RescheduleBatchRow = {
  id: Uuid;
  organization_id: Uuid;
  emergency_action_id: Uuid;
  status: EmergencyActionStatus;
  target_date: string;
  affected_events_count: number;
  created_at: DateTime;
  updated_at: DateTime;
};

export type RescheduleProposalRow = {
  id: Uuid;
  organization_id: Uuid;
  emergency_action_id: Uuid;
  reschedule_batch_id: Uuid | null;
  calendar_event_id: Uuid;
  contact_id: Uuid | null;
  original_starts_at: DateTime;
  original_ends_at: DateTime;
  proposed_starts_at: DateTime | null;
  proposed_ends_at: DateTime | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  preferred_channel: "email" | "whatsapp" | "manual_review";
  message_body: string;
  status: EmergencyActionStatus;
  created_at: DateTime;
  updated_at: DateTime;
};

export type QuickCallNoteRow = {
  id: Uuid;
  organization_id: Uuid;
  created_by: Uuid | null;
  raw_text: string;
  status: QuickCallNoteStatus;
  intent_type: QuickCallIntentType;
  confidence: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  requested_datetime_text: string | null;
  requested_start: DateTime | null;
  requested_end: DateTime | null;
  reason: string | null;
  extracted_constraints: Json;
  analysis: Json;
  created_at: DateTime;
  updated_at: DateTime;
};

export type ApprovalLogRow = {
  id: Uuid;
  organization_id: Uuid;
  suggested_action_id: Uuid | null;
  emergency_action_id: Uuid | null;
  actor_user_id: Uuid | null;
  event: ApprovalLogEvent;
  previous_status: ApprovalState | null;
  next_status: ApprovalState | null;
  note: string | null;
  metadata: Json;
  created_at: DateTime;
};

export type DailySummarySettingsRow = {
  id: Uuid;
  organization_id: Uuid;
  user_id: Uuid;
  enabled: boolean;
  timezone: string;
  delivery_time: Time;
  channels: CommunicationChannelType[];
  include_calendar: boolean;
  include_pending_approvals: boolean;
  include_calendar_conflicts: boolean;
  include_unanswered_messages: boolean;
  include_free_slots: boolean;
  created_at: DateTime;
  updated_at: DateTime;
};

export type DailySummaryRow = {
  id: Uuid;
  organization_id: Uuid;
  summary_date: string;
  timezone: string;
  status: DailySummaryStatus;
  title: string;
  headline: string;
  total_appointments: number;
  first_appointment_at: DateTime | null;
  last_appointment_at: DateTime | null;
  pending_approvals_count: number;
  conflicts_count: number;
  unhandled_messages_count: number;
  free_slots_count: number;
  items: Json;
  recommendations: Json;
  generated_at: DateTime;
  viewed_at: DateTime | null;
  created_at: DateTime;
  updated_at: DateTime;
};

export type CalendarEventCacheRow = {
  id: Uuid;
  organization_id: Uuid;
  connected_account_id: Uuid | null;
  provider: CalendarProvider | null;
  external_event_id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: DateTime;
  ends_at: DateTime;
  timezone: string | null;
  status: CalendarEventStatus;
  attendees: Json;
  is_all_day: boolean;
  raw_event: Json;
  synced_at: DateTime;
  created_at: DateTime;
  updated_at: DateTime;
};

export type NotificationTokenRow = {
  id: Uuid;
  organization_id: Uuid;
  user_id: Uuid;
  platform: "ios" | "android" | "web";
  device_type: DeviceType;
  smartwatch_platform: SmartwatchPlatform;
  token: string;
  expo_push_token: string;
  device_name: string | null;
  app_version: string | null;
  capabilities: Json;
  status: NotificationTokenStatus;
  last_seen_at: DateTime;
  revoked_at: DateTime | null;
  metadata: Json;
  created_at: DateTime;
  updated_at: DateTime;
};

export type NotificationPreferencesRow = {
  id: Uuid;
  organization_id: Uuid;
  user_id: Uuid;
  watch_friendly_notifications_enabled: boolean;
  allow_quick_approve_from_watch: boolean;
  allow_quick_ignore_from_watch: boolean;
  show_daily_summary_on_watch: boolean;
  emergency_shortcuts_on_watch: boolean;
  created_at: DateTime;
  updated_at: DateTime;
};

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body: string;
  data: Json;
  organizationId: Uuid;
  userId: Uuid;
};

export type SmartwatchNotificationPayload = {
  type: NotificationType;
  title: string;
  shortBody: string;
  actionId: Uuid | string | null;
  suggestedActionId: Uuid | null;
  emergencyActionId: Uuid | null;
  dailySummaryId: Uuid | null;
  deepLink: string;
  signedActionToken?: string | null;
  signedActionTokens?: Partial<Record<SmartwatchActionType, string>>;
  requiresMobileForEdit: boolean;
  safetyLabel: "Draft only";
};

export type ExecutionRecordRow = {
  id: Uuid;
  organization_id: Uuid;
  suggested_action_id: Uuid;
  executed_by: Uuid | null;
  execution_type: ExecutionType;
  status: ExecutionStatus;
  dry_run: boolean;
  provider: string | null;
  request_payload: Json;
  response_payload: Json;
  error_message: string | null;
  final_confirmation_text: string | null;
  created_at: DateTime;
  executed_at: DateTime | null;
  updated_at: DateTime;
};

export type ExecutionRecord = {
  id: Uuid;
  organizationId: Uuid;
  suggestedActionId: Uuid;
  executedBy: Uuid | null;
  executionType: ExecutionType;
  status: ExecutionStatus;
  dryRun: boolean;
  provider: string | null;
  requestPayload: Json;
  responsePayload: Json;
  errorMessage: string | null;
  finalConfirmationText: string | null;
  createdAt: DateTime;
  executedAt: DateTime | null;
  updatedAt: DateTime;
};

export type ExecutionPreview = {
  suggestedActionId: Uuid;
  executionType: ExecutionType;
  provider: string | null;
  recipient: string | null;
  subject: string | null;
  body: string | null;
  calendarChange: Json | null;
  warnings: string[];
  dryRun: boolean;
  canExecute: boolean;
};

export type SyncLogRow = {
  id: Uuid;
  organization_id: Uuid;
  provider: SyncProvider;
  job_type: SyncJobType;
  status: SyncStatus;
  started_at: DateTime;
  finished_at: DateTime | null;
  records_read: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  error_message: string | null;
  metadata: Json;
  created_at: DateTime;
};

export type SyncLog = {
  id: Uuid;
  organizationId: Uuid;
  provider: SyncProvider;
  jobType: SyncJobType;
  status: SyncStatus;
  startedAt: DateTime;
  finishedAt: DateTime | null;
  recordsRead: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorMessage: string | null;
  metadata: Json;
  createdAt: DateTime;
};

export type TokenRefreshResult = {
  provider: SyncProvider;
  refreshed: boolean;
  expiresAt: DateTime | null;
  errorMessage: string | null;
};

export type AuditLogRow = {
  id: Uuid;
  organization_id: Uuid | null;
  actor_type: AuditActorType;
  actor_user_id: Uuid | null;
  event_name: string;
  entity_table: string | null;
  entity_id: Uuid | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json;
  created_at: DateTime;
};

export type UserRuleRow = {
  id: Uuid;
  organization_id: Uuid;
  user_id: Uuid | null;
  scope: UserRuleScope;
  contact_id: Uuid | null;
  title: string;
  instruction: string;
  priority: number;
  is_active: boolean;
  metadata: Json;
  created_at: DateTime;
  updated_at: DateTime;
};

export type Database = {
  public: {
    Tables: {
      organizations: TableDefinition<
        OrganizationRow,
        InsertShape<OrganizationRow, "name" | "slug">,
        UpdateShape<OrganizationRow>
      >;
      organization_members: TableDefinition<
        OrganizationMemberRow,
        InsertShape<OrganizationMemberRow, "organization_id" | "user_id">,
        UpdateShape<OrganizationMemberRow>
      >;
      connected_accounts: TableDefinition<
        ConnectedAccountRow,
        InsertShape<
          ConnectedAccountRow,
          "organization_id" | "provider" | "provider_account_id"
        >,
        UpdateShape<ConnectedAccountRow>
      >;
      communication_channels: TableDefinition<
        CommunicationChannelRow,
        InsertShape<CommunicationChannelRow, "organization_id" | "type" | "name">,
        UpdateShape<CommunicationChannelRow>
      >;
      contacts: TableDefinition<
        ContactRow,
        InsertShape<ContactRow, "organization_id" | "display_name">,
        UpdateShape<ContactRow>
      >;
      incoming_messages: TableDefinition<
        IncomingMessageRow,
        InsertShape<IncomingMessageRow, "organization_id" | "received_at">,
        UpdateShape<IncomingMessageRow>
      >;
      appointment_requests: TableDefinition<
        AppointmentRequestRow,
        InsertShape<AppointmentRequestRow, "organization_id">,
        UpdateShape<AppointmentRequestRow>
      >;
      suggested_actions: TableDefinition<
        SuggestedActionRow,
        InsertShape<SuggestedActionRow, "organization_id" | "action_type" | "title">,
        UpdateShape<SuggestedActionRow>
      >;
      execution_records: TableDefinition<
        ExecutionRecordRow,
        InsertShape<ExecutionRecordRow, "organization_id" | "suggested_action_id" | "execution_type">,
        UpdateShape<ExecutionRecordRow>
      >;
      sync_logs: TableDefinition<
        SyncLogRow,
        InsertShape<SyncLogRow, "organization_id" | "provider" | "job_type">,
        UpdateShape<SyncLogRow>
      >;
      emergency_actions: TableDefinition<
        EmergencyActionRow,
        InsertShape<EmergencyActionRow, "organization_id" | "action_type" | "reason">,
        UpdateShape<EmergencyActionRow>
      >;
      reschedule_batches: TableDefinition<
        RescheduleBatchRow,
        InsertShape<RescheduleBatchRow, "organization_id" | "emergency_action_id" | "target_date">,
        UpdateShape<RescheduleBatchRow>
      >;
      reschedule_proposals: TableDefinition<
        RescheduleProposalRow,
        InsertShape<
          RescheduleProposalRow,
          "organization_id" | "emergency_action_id" | "calendar_event_id" | "original_starts_at" | "original_ends_at" | "message_body"
        >,
        UpdateShape<RescheduleProposalRow>
      >;
      call_notes: TableDefinition<
        QuickCallNoteRow,
        InsertShape<QuickCallNoteRow, "organization_id" | "raw_text">,
        UpdateShape<QuickCallNoteRow>
      >;
      approval_logs: TableDefinition<
        ApprovalLogRow,
        InsertShape<ApprovalLogRow, "organization_id" | "event">,
        UpdateShape<ApprovalLogRow>
      >;
      daily_summary_settings: TableDefinition<
        DailySummarySettingsRow,
        InsertShape<DailySummarySettingsRow, "organization_id" | "user_id">,
        UpdateShape<DailySummarySettingsRow>
      >;
      daily_summaries: TableDefinition<
        DailySummaryRow,
        InsertShape<DailySummaryRow, "organization_id" | "summary_date" | "title" | "headline">,
        UpdateShape<DailySummaryRow>
      >;
      calendar_events_cache: TableDefinition<
        CalendarEventCacheRow,
        InsertShape<
          CalendarEventCacheRow,
          "organization_id" | "external_event_id" | "calendar_id" | "title" | "starts_at" | "ends_at"
        >,
        UpdateShape<CalendarEventCacheRow>
      >;
      notification_tokens: TableDefinition<
        NotificationTokenRow,
        InsertShape<NotificationTokenRow, "organization_id" | "user_id" | "platform" | "token">,
        UpdateShape<NotificationTokenRow>
      >;
      notification_preferences: TableDefinition<
        NotificationPreferencesRow,
        InsertShape<NotificationPreferencesRow, "organization_id" | "user_id">,
        UpdateShape<NotificationPreferencesRow>
      >;
      audit_logs: TableDefinition<
        AuditLogRow,
        InsertShape<AuditLogRow, "actor_type" | "event_name">,
        UpdateShape<AuditLogRow>
      >;
      user_rules: TableDefinition<
        UserRuleRow,
        InsertShape<UserRuleRow, "organization_id" | "title" | "instruction">,
        UpdateShape<UserRuleRow>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_user_is_org_member: {
        Args: { target_org_id: Uuid };
        Returns: boolean;
      };
      current_user_has_org_role: {
        Args: { target_org_id: Uuid; allowed_roles: OrganizationRole[] };
        Returns: boolean;
      };
      organization_has_no_members: {
        Args: { target_org_id: Uuid };
        Returns: boolean;
      };
      create_organization_for_current_user: {
        Args: {
          organization_name: string;
          organization_slug: string;
          organization_timezone?: string;
        };
        Returns: OrganizationRow;
      };
    };
    Enums: {
      organization_role: OrganizationRole;
      account_provider: AccountProvider;
      connected_account_status: ConnectedAccountStatus;
      communication_channel_type: CommunicationChannelType;
      communication_channel_status: CommunicationChannelStatus;
      message_direction: MessageDirection;
      message_status: MessageStatus;
      appointment_request_status: AppointmentRequestStatus;
      suggested_action_type: SuggestedActionType;
      approval_state: ApprovalState;
      approval_log_event: ApprovalLogEvent;
      emergency_action_type: EmergencyActionType;
      emergency_action_status: EmergencyActionStatus;
      quick_call_note_status: QuickCallNoteStatus;
      quick_call_intent_type: QuickCallIntentType;
      calendar_event_status: CalendarEventStatus;
      calendar_provider: CalendarProvider;
      email_provider: EmailProvider;
      whatsapp_provider: WhatsAppProvider;
      daily_summary_status: DailySummaryStatus;
      execution_status: ExecutionStatus;
      execution_type: ExecutionType;
      sync_provider: SyncProvider;
      sync_status: SyncStatus;
      sync_job_type: SyncJobType;
      audit_actor_type: AuditActorType;
      user_rule_scope: UserRuleScope;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type ConnectedAccount = Database["public"]["Tables"]["connected_accounts"]["Row"];
export type CommunicationChannel = Database["public"]["Tables"]["communication_channels"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type IncomingMessage = Database["public"]["Tables"]["incoming_messages"]["Row"];
export type AppointmentRequest = Database["public"]["Tables"]["appointment_requests"]["Row"];
export type SuggestedAction = Database["public"]["Tables"]["suggested_actions"]["Row"];
export type ExecutionRecordDatabase = Database["public"]["Tables"]["execution_records"]["Row"];
export type SyncLogDatabase = Database["public"]["Tables"]["sync_logs"]["Row"];
export type EmergencyActionRecord = Database["public"]["Tables"]["emergency_actions"]["Row"];
export type RescheduleBatchRecord = Database["public"]["Tables"]["reschedule_batches"]["Row"];
export type RescheduleProposalRecord = Database["public"]["Tables"]["reschedule_proposals"]["Row"];
export type QuickCallNoteRecord = Database["public"]["Tables"]["call_notes"]["Row"];
export type ApprovalLogRecord = Database["public"]["Tables"]["approval_logs"]["Row"];
export type DailySummarySettingsRecord =
  Database["public"]["Tables"]["daily_summary_settings"]["Row"];
export type DailySummaryRecord = Database["public"]["Tables"]["daily_summaries"]["Row"];
export type CalendarEventCache = Database["public"]["Tables"]["calendar_events_cache"]["Row"];
export type NotificationToken = Database["public"]["Tables"]["notification_tokens"]["Row"];
export type NotificationPreferencesRecord = Database["public"]["Tables"]["notification_preferences"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type UserRule = Database["public"]["Tables"]["user_rules"]["Row"];

export type RegisteredNotificationToken = {
  id: Uuid;
  organizationId: Uuid;
  userId: Uuid;
  platform: "ios" | "android" | "web";
  deviceType: DeviceType;
  smartwatchPlatform: SmartwatchPlatform;
  expoPushToken: string;
  deviceName: string | null;
  capabilities: DeviceCapability[];
  status: NotificationTokenStatus;
  createdAt: DateTime;
  updatedAt: DateTime;
  lastSeenAt: DateTime;
};

export type RegisteredDevice = {
  id: Uuid;
  organizationId: Uuid;
  userId: Uuid;
  deviceType: DeviceType;
  platform: SmartwatchPlatform;
  deviceName: string | null;
  pushToken: string;
  capabilities: DeviceCapability[];
  status: NotificationTokenStatus;
  lastSeenAt: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export type NotificationPreferences = {
  id: Uuid;
  organizationId: Uuid;
  userId: Uuid;
  watchFriendlyNotificationsEnabled: boolean;
  allowQuickApproveFromWatch: boolean;
  allowQuickIgnoreFromWatch: boolean;
  showDailySummaryOnWatch: boolean;
  emergencyShortcutsOnWatch: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export function toConnectedCalendarAccount(row: ConnectedAccount): ConnectedCalendarAccount {
  const provider = row.provider === "microsoft_calendar" ? "microsoft" : "google";

  return {
    id: row.id,
    organizationId: row.organization_id,
    provider,
    providerAccountId: row.provider_account_id,
    email: row.email,
    displayName: row.display_name,
    accessTokenEncrypted: row.encrypted_access_token,
    refreshTokenEncrypted: row.encrypted_refresh_token,
    expiresAt: row.token_expires_at,
    scopes: row.scopes,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
    lastTokenRefreshAt: row.last_token_refresh_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toConnectedEmailAccount(row: ConnectedAccount): ConnectedEmailAccount {
  const provider = row.provider === "microsoft_mail" ? "microsoft" : "gmail";

  return {
    id: row.id,
    organizationId: row.organization_id,
    provider,
    providerAccountId: row.provider_account_id,
    email: row.email,
    displayName: row.display_name,
    accessTokenEncrypted: row.encrypted_access_token,
    refreshTokenEncrypted: row.encrypted_refresh_token,
    expiresAt: row.token_expires_at,
    scopes: row.scopes,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
    lastTokenRefreshAt: row.last_token_refresh_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toConnectedWhatsAppAccount(row: ConnectedAccount): ConnectedWhatsAppAccount {
  const metadata = toJsonRecord(row.metadata);

  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: "whatsapp_business_cloud",
    businessAccountId: readJsonString(metadata, "businessAccountId"),
    phoneNumberId: readJsonString(metadata, "phoneNumberId") ?? row.provider_account_id,
    displayPhoneNumber: readJsonString(metadata, "displayPhoneNumber"),
    verifiedName: readJsonString(metadata, "verifiedName") ?? row.display_name,
    accessTokenEncrypted: row.encrypted_access_token,
    webhookVerifyToken: readJsonString(metadata, "webhookVerifyToken"),
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
    lastTokenRefreshAt: row.last_token_refresh_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toNormalizedEmailMessage(row: IncomingMessage): NormalizedEmailMessage {
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata
    : {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.email_provider ?? "gmail",
    providerMessageId: row.provider_message_id ?? "",
    providerThreadId: row.thread_id,
    emailAccountId: row.connected_account_id ?? "",
    fromEmail: row.from_email,
    fromName: row.from_name,
    toEmails: row.to_emails,
    ccEmails: row.cc_emails,
    subject: row.subject,
    snippet: row.snippet,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    receivedAt: row.received_at,
    hasAttachments: row.has_attachments,
    raw: metadata.raw ?? row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toNormalizedWhatsAppMessage(row: IncomingMessage): NormalizedWhatsAppMessage {
  const metadata = toJsonRecord(row.metadata);

  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.whatsapp_provider ?? "whatsapp_business_cloud",
    providerMessageId: row.provider_message_id ?? "",
    providerThreadId: row.thread_id,
    whatsappAccountId: row.connected_account_id ?? "",
    fromPhone: row.whatsapp_phone,
    fromName: row.from_name,
    toPhoneNumberId: readJsonString(metadata, "toPhoneNumberId"),
    messageType: row.whatsapp_message_type ?? "text",
    textBody: row.body_text,
    receivedAt: row.received_at,
    raw: metadata.raw ?? row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toNormalizedCalendarEvent(row: CalendarEventCache): NormalizedCalendarEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider ?? "google",
    providerEventId: row.external_event_id,
    calendarAccountId: row.connected_account_id ?? "",
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    isAllDay: row.is_all_day,
    attendees: Array.isArray(row.attendees) ? (row.attendees as CalendarAttendee[]) : [],
    status: row.status,
    raw: row.raw_event,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDailySummarySettings(row: DailySummarySettingsRecord): DailySummarySettings {
  return {
    organizationId: row.organization_id,
    enabled: row.enabled,
    deliveryTime: row.delivery_time,
    timezone: row.timezone,
    includeCalendar: row.include_calendar,
    includePendingApprovals: row.include_pending_approvals,
    includeUnhandledMessages: row.include_unanswered_messages,
    includeFreeSlots: row.include_free_slots,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDailySummary(row: DailySummaryRecord): DailySummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    summaryDate: row.summary_date,
    timezone: row.timezone,
    status: row.status,
    title: row.title,
    headline: row.headline,
    totalAppointments: row.total_appointments,
    firstAppointmentAt: row.first_appointment_at,
    lastAppointmentAt: row.last_appointment_at,
    pendingApprovalsCount: row.pending_approvals_count,
    conflictsCount: row.conflicts_count,
    unhandledMessagesCount: row.unhandled_messages_count,
    freeSlotsCount: row.free_slots_count,
    items: parseSummaryItems(row.items),
    recommendations: parseSummaryItems(row.recommendations),
    generatedAt: row.generated_at,
    viewedAt: row.viewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEmergencyAction(row: EmergencyActionRecord): EmergencyAction {
  const metadata = toJsonRecord(row.metadata);

  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by ?? row.requested_by,
    type: row.action_type,
    status: row.status,
    reason: row.reason,
    targetDate: row.target_date,
    delayMinutes: row.delay_minutes,
    messageTone: row.message_tone,
    affectedEventsCount: row.affected_events_count,
    suggestedActionsCount: row.suggested_actions_count,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRescheduleBatch(row: RescheduleBatchRecord): RescheduleBatch {
  return {
    id: row.id,
    organizationId: row.organization_id,
    emergencyActionId: row.emergency_action_id,
    status: row.status,
    targetDate: row.target_date,
    affectedEventsCount: row.affected_events_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRescheduleProposal(row: RescheduleProposalRecord): RescheduleProposal {
  return {
    id: row.id,
    organizationId: row.organization_id,
    emergencyActionId: row.emergency_action_id,
    rescheduleBatchId: row.reschedule_batch_id,
    calendarEventId: row.calendar_event_id,
    contactId: row.contact_id,
    originalStartsAt: row.original_starts_at,
    originalEndsAt: row.original_ends_at,
    proposedStartsAt: row.proposed_starts_at,
    proposedEndsAt: row.proposed_ends_at,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    recipientPhone: row.recipient_phone,
    preferredChannel: row.preferred_channel,
    messageBody: row.message_body,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRegisteredNotificationToken(row: NotificationToken): RegisteredNotificationToken {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    platform: row.platform,
    deviceType: row.device_type,
    smartwatchPlatform: row.smartwatch_platform,
    expoPushToken: row.expo_push_token || row.token,
    deviceName: row.device_name,
    capabilities: parseDeviceCapabilities(row.capabilities),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function toRegisteredDevice(row: NotificationToken): RegisteredDevice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    deviceType: row.device_type,
    platform: row.smartwatch_platform,
    deviceName: row.device_name,
    pushToken: row.expo_push_token || row.token,
    capabilities: parseDeviceCapabilities(row.capabilities),
    status: row.status,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toNotificationPreferences(row: NotificationPreferencesRecord): NotificationPreferences {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    watchFriendlyNotificationsEnabled: row.watch_friendly_notifications_enabled,
    allowQuickApproveFromWatch: row.allow_quick_approve_from_watch,
    allowQuickIgnoreFromWatch: row.allow_quick_ignore_from_watch,
    showDailySummaryOnWatch: row.show_daily_summary_on_watch,
    emergencyShortcutsOnWatch: row.emergency_shortcuts_on_watch,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExecutionRecord(row: ExecutionRecordDatabase): ExecutionRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    suggestedActionId: row.suggested_action_id,
    executedBy: row.executed_by,
    executionType: row.execution_type,
    status: row.status,
    dryRun: row.dry_run,
    provider: row.provider,
    requestPayload: row.request_payload,
    responsePayload: row.response_payload,
    errorMessage: row.error_message,
    finalConfirmationText: row.final_confirmation_text,
    createdAt: row.created_at,
    executedAt: row.executed_at,
    updatedAt: row.updated_at,
  };
}

export function toSyncLog(row: SyncLogDatabase): SyncLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    jobType: row.job_type,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    recordsRead: row.records_read,
    recordsCreated: row.records_created,
    recordsUpdated: row.records_updated,
    recordsSkipped: row.records_skipped,
    errorMessage: row.error_message,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export function toQuickCallNote(row: QuickCallNoteRecord): QuickCallNote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    rawText: row.raw_text,
    status: row.status,
    intentType: row.intent_type,
    confidence: row.confidence,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    requestedDateTimeText: row.requested_datetime_text,
    requestedStartsAt: row.requested_start,
    requestedEndsAt: row.requested_end,
    reason: row.reason,
    extractedConstraints: row.extracted_constraints,
    analysis: row.analysis,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function requiresApproval(
  action: Pick<SuggestedAction, "requires_approval" | "status">,
): boolean {
  return action.requires_approval && action.status === "pending_approval";
}

function toJsonRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readJsonString(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseDeviceCapabilities(value: Json): DeviceCapability[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is DeviceCapability =>
    typeof item === "string" && deviceCapabilities.includes(item as DeviceCapability),
  );
}

function parseSummaryItems(value: Json): DailySummaryItem[] {
  return Array.isArray(value) ? (value as DailySummaryItem[]) : [];
}
