import type {
  AppointmentRequest,
  CalendarConnectionStatus,
  DailySummary,
  DailySummarySettings,
  EmailConnectionStatus,
  EmergencyAction,
  EmergencyModeResult,
  Json,
  NormalizedCalendarEvent,
  NormalizedEmailMessage,
  NormalizedWhatsAppMessage,
  NotificationPreferences,
  Organization,
  OrganizationMember,
  QuickCallNote,
  QuickCallResult,
  RegisteredDevice,
  RescheduleProposal,
  SuggestedAction,
  SyncLog,
  Uuid,
  WhatsAppConnectionStatus,
} from "./index";
import { resolveLocale, type SupportedLocale } from "./i18n";

export const SOREYA_DEMO_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
export const SOREYA_DEMO_USER_ID = "00000000-0000-4000-8000-000000000002";
export const SOREYA_DEMO_COPY =
  "Dati demo locali. Nessun provider viene chiamato e nessuna azione viene eseguita.";
export const SOREYA_DEMO_COPY_EN =
  "Local demo data only. No provider is called and no action is executed.";

export type DemoNotificationStatus = {
  expoConfigured: boolean;
  pushEnabled: boolean;
  registeredDevices: number;
  lastDeliveryStatus: "demo_ready" | "disabled";
  message: string;
};

export type SoreyaDemoData = {
  isDemo: true;
  organization: Organization;
  membership: OrganizationMember;
  calendarStatuses: CalendarConnectionStatus[];
  calendarEvents: NormalizedCalendarEvent[];
  emailStatuses: EmailConnectionStatus[];
  emailMessages: NormalizedEmailMessage[];
  whatsappStatus: WhatsAppConnectionStatus;
  whatsappMessages: NormalizedWhatsAppMessage[];
  appointmentRequests: AppointmentRequest[];
  suggestedActions: SuggestedAction[];
  dailySummarySettings: DailySummarySettings;
  dailySummary: DailySummary;
  emergencyActions: EmergencyAction[];
  emergencyResult: EmergencyModeResult;
  quickCallNotes: QuickCallNote[];
  quickCallResult: QuickCallResult;
  syncLogs: SyncLog[];
  notificationPreferences: NotificationPreferences;
  registeredDevices: RegisteredDevice[];
  notificationStatus: DemoNotificationStatus;
};

export function getSoreyaDemoData(localeOrNow: SupportedLocale | Date = "it", maybeNow = new Date()): SoreyaDemoData {
  const locale = localeOrNow instanceof Date ? "it" : resolveLocale(localeOrNow);
  const now = localeOrNow instanceof Date ? localeOrNow : maybeNow;
  const copy = demoCopy[locale];
  const createdAt = addMinutes(now, -180).toISOString();
  const updatedAt = addMinutes(now, -8).toISOString();
  const today = dateKey(now);
  const tomorrow = addDays(now, 1);
  const tomorrowKey = dateKey(tomorrow);
  const dayAfterTomorrow = addDays(now, 2);
  const organizationId = SOREYA_DEMO_ORGANIZATION_ID as Uuid;
  const userId = SOREYA_DEMO_USER_ID as Uuid;
  const calendarAccountId = demoUuid("101");
  const emailAccountId = demoUuid("102");
  const whatsappAccountId = demoUuid("103");
  const emailMessageId = demoUuid("201");
  const whatsappMessageId = demoUuid("202");
  const quickCallId = demoUuid("203");
  const calendarEventOneId = demoUuid("301");
  const calendarEventTwoId = demoUuid("302");
  const calendarEventThreeId = demoUuid("303");
  const appointmentRequestEmailId = demoUuid("401");
  const appointmentRequestWhatsappId = demoUuid("402");
  const appointmentRequestCallId = demoUuid("403");
  const emergencyActionId = demoUuid("501");
  const proposalId = demoUuid("502");
  const actionEmailId = demoUuid("601");
  const actionWhatsappId = demoUuid("602");
  const actionEmergencyId = demoUuid("603");
  const actionCallId = demoUuid("604");

  const calendarEvents: NormalizedCalendarEvent[] = [
    {
      id: calendarEventOneId,
      organizationId,
      provider: "google",
      providerEventId: "demo-calendar-1",
      calendarAccountId,
      title: copy.calendarDentistTitle,
      description: copy.calendarDentistDescription,
      location: "Via Roma 12, Milano",
      startsAt: atLocal(today, 9, 30).toISOString(),
      endsAt: atLocal(today, 10, 15).toISOString(),
      timezone: "Europe/Rome",
      isAllDay: false,
      attendees: [
        {
          email: "studio@example.test",
          displayName: "Studio Rossi",
          responseStatus: "accepted",
        },
      ],
      status: "confirmed",
      raw: demoMeta("calendar_event"),
      createdAt,
      updatedAt,
    },
    {
      id: calendarEventTwoId,
      organizationId,
      provider: "google",
      providerEventId: "demo-calendar-2",
      calendarAccountId,
      title: copy.calendarReviewTitle,
      description: copy.calendarReviewDescription,
      location: "Google Meet",
      startsAt: atLocal(today, 14, 0).toISOString(),
      endsAt: atLocal(today, 14, 45).toISOString(),
      timezone: "Europe/Rome",
      isAllDay: false,
      attendees: [
        {
          email: "laura@example.test",
          displayName: "Laura Bianchi",
          responseStatus: "needsAction",
        },
      ],
      status: "confirmed",
      raw: demoMeta("calendar_event"),
      createdAt,
      updatedAt,
    },
    {
      id: calendarEventThreeId,
      organizationId,
      provider: "google",
      providerEventId: "demo-calendar-3",
      calendarAccountId,
      title: copy.calendarQuoteTitle,
      description: copy.calendarQuoteDescription,
      location: copy.customerLocation,
      startsAt: atLocal(tomorrowKey, 16, 30).toISOString(),
      endsAt: atLocal(tomorrowKey, 17, 15).toISOString(),
      timezone: "Europe/Rome",
      isAllDay: false,
      attendees: [
        {
          email: null,
          displayName: "Giulia Conti",
          responseStatus: "tentative",
        },
      ],
      status: "tentative",
      raw: demoMeta("calendar_event"),
      createdAt,
      updatedAt,
    },
  ];

  const emailMessages: NormalizedEmailMessage[] = [
    {
      id: emailMessageId,
      organizationId,
      provider: "gmail",
      providerMessageId: "demo-email-1",
      providerThreadId: "demo-thread-email-1",
      emailAccountId,
      fromEmail: "marta.neri@example.test",
      fromName: "Marta Neri",
      toEmails: ["demo@soreya.local"],
      ccEmails: [],
      subject: copy.emailSubject,
      snippet: copy.emailSnippet,
      bodyText: copy.emailBody,
      bodyHtml: null,
      receivedAt: addMinutes(now, -52).toISOString(),
      hasAttachments: false,
      raw: demoMeta("email_message"),
      createdAt,
      updatedAt,
    },
  ];

  const whatsappMessages: NormalizedWhatsAppMessage[] = [
    {
      id: whatsappMessageId,
      organizationId,
      provider: "whatsapp_business_cloud",
      providerMessageId: "demo-whatsapp-1",
      providerThreadId: "demo-thread-whatsapp-1",
      whatsappAccountId,
      fromPhone: "+393331234567",
      fromName: "Giulia Conti",
      toPhoneNumberId: "demo-phone-number-id",
      messageType: "text",
      textBody: copy.whatsappBody,
      receivedAt: addMinutes(now, -28).toISOString(),
      raw: demoMeta("whatsapp_message"),
      createdAt,
      updatedAt,
    },
  ];

  const quickCallNote: QuickCallNote = {
    id: quickCallId,
    organizationId,
    createdBy: userId,
    rawText: copy.quickCallRawText,
    status: "pending_approval",
    intentType: "callback_request",
    confidence: 0.88,
    customerName: "Andrea Riva",
    customerEmail: "andrea.riva@example.test",
    customerPhone: "+393339998888",
    requestedDateTimeText: copy.quickCallRequestedTime,
    requestedStartsAt: atLocal(dateKey(dayAfterTomorrow), 10, 0).toISOString(),
    requestedEndsAt: atLocal(dateKey(dayAfterTomorrow), 10, 15).toISOString(),
    reason: copy.quickCallReason,
    extractedConstraints: demoMeta("quick_call_constraints"),
    analysis: {
      demo: true,
      source: "quick_call_analysis",
      safety: copy.safety,
      needsMoreInfo: false,
    },
    createdAt: addMinutes(now, -18).toISOString(),
    updatedAt,
  };

  const appointmentRequests: AppointmentRequest[] = [
    {
      id: appointmentRequestEmailId,
      organization_id: organizationId,
      incoming_message_id: emailMessageId,
      call_note_id: null,
      contact_id: null,
      source_channel: "email",
      source_type: "email",
      status: "pending_approval",
      title: copy.appointmentEmailTitle,
      requested_start: atLocal(tomorrowKey, 11, 0).toISOString(),
      requested_end: atLocal(tomorrowKey, 11, 30).toISOString(),
      requested_timezone: "Europe/Rome",
      duration_minutes: 30,
      location: copy.videoCall,
      meeting_type: "call",
      confidence: 0.91,
      conflict_detected: false,
      conflict_reason: null,
      alternatives: [],
      extracted_details: demoMeta("appointment_email"),
      created_at: addMinutes(now, -48).toISOString(),
      updated_at: updatedAt,
    },
    {
      id: appointmentRequestWhatsappId,
      organization_id: organizationId,
      incoming_message_id: whatsappMessageId,
      call_note_id: null,
      contact_id: null,
      source_channel: "whatsapp",
      source_type: "whatsapp",
      status: "pending_approval",
      title: copy.appointmentWhatsappTitle,
      requested_start: atLocal(tomorrowKey, 16, 30).toISOString(),
      requested_end: atLocal(tomorrowKey, 17, 15).toISOString(),
      requested_timezone: "Europe/Rome",
      duration_minutes: 45,
      location: copy.customerLocationShort,
      meeting_type: "in_person",
      confidence: 0.86,
      conflict_detected: false,
      conflict_reason: null,
      alternatives: [],
      extracted_details: demoMeta("appointment_whatsapp"),
      created_at: addMinutes(now, -26).toISOString(),
      updated_at: updatedAt,
    },
    {
      id: appointmentRequestCallId,
      organization_id: organizationId,
      incoming_message_id: null,
      call_note_id: quickCallId,
      contact_id: null,
      source_channel: "calendar",
      source_type: "quick_call",
      status: "pending_approval",
      title: copy.appointmentCallTitle,
      requested_start: quickCallNote.requestedStartsAt,
      requested_end: quickCallNote.requestedEndsAt,
      requested_timezone: "Europe/Rome",
      duration_minutes: 15,
      location: copy.phone,
      meeting_type: "call",
      confidence: 0.88,
      conflict_detected: false,
      conflict_reason: null,
      alternatives: [],
      extracted_details: demoMeta("appointment_call"),
      created_at: quickCallNote.createdAt,
      updated_at: updatedAt,
    },
  ];

  const emergencyAction: EmergencyAction = {
    id: emergencyActionId,
    organizationId,
    createdBy: userId,
    type: "notify_delay",
    status: "pending_approval",
    reason: copy.emergencyReason,
    targetDate: today,
    delayMinutes: 20,
    messageTone: "professional",
    affectedEventsCount: 1,
    suggestedActionsCount: 1,
    metadata: demoMeta("emergency_action"),
    createdAt: addMinutes(now, -12).toISOString(),
    updatedAt,
  };

  const proposal: RescheduleProposal = {
    id: proposalId,
    organizationId,
    emergencyActionId,
    rescheduleBatchId: null,
    calendarEventId: calendarEventTwoId,
    contactId: null,
    originalStartsAt: calendarEvents[1].startsAt,
    originalEndsAt: calendarEvents[1].endsAt,
    proposedStartsAt: null,
    proposedEndsAt: null,
    recipientName: "Laura Bianchi",
    recipientEmail: "laura@example.test",
    recipientPhone: null,
    preferredChannel: "email",
    messageBody: copy.emergencyProposalBody,
    status: "draft",
    createdAt: emergencyAction.createdAt,
    updatedAt,
  };

  const suggestedActions: SuggestedAction[] = [
    {
      id: actionEmailId,
      organization_id: organizationId,
      appointment_request_id: appointmentRequestEmailId,
      emergency_action_id: null,
      reschedule_proposal_id: null,
      call_note_id: null,
      incoming_message_id: emailMessageId,
      contact_id: null,
      action_type: "send_email_reply",
      status: "pending_approval",
      title: copy.actionEmailTitle,
      rationale: copy.actionEmailRationale,
      draft_payload: {
        demo: true,
        to: "marta.neri@example.test",
        subject: copy.actionEmailSubject,
        body: copy.actionEmailBody,
      },
      external_payload: {},
      risk_level: "normal",
      requires_approval: true,
      approved_by: null,
      approved_at: null,
      execution_status: "dry_run",
      executed_at: null,
      failed_reason: null,
      expires_at: addDays(now, 2).toISOString(),
      created_by_ai: true,
      created_at: addMinutes(now, -47).toISOString(),
      updated_at: updatedAt,
    },
    {
      id: actionWhatsappId,
      organization_id: organizationId,
      appointment_request_id: appointmentRequestWhatsappId,
      emergency_action_id: null,
      reschedule_proposal_id: null,
      call_note_id: null,
      incoming_message_id: whatsappMessageId,
      contact_id: null,
      action_type: "send_whatsapp_reply",
      status: "pending_approval",
      title: copy.actionWhatsappTitle,
      rationale: copy.actionWhatsappRationale,
      draft_payload: {
        demo: true,
        to: "+393331234567",
        body: copy.actionWhatsappBody,
      },
      external_payload: {},
      risk_level: "normal",
      requires_approval: true,
      approved_by: null,
      approved_at: null,
      execution_status: "dry_run",
      executed_at: null,
      failed_reason: null,
      expires_at: addDays(now, 2).toISOString(),
      created_by_ai: true,
      created_at: addMinutes(now, -24).toISOString(),
      updated_at: updatedAt,
    },
    {
      id: actionEmergencyId,
      organization_id: organizationId,
      appointment_request_id: null,
      emergency_action_id: emergencyActionId,
      reschedule_proposal_id: proposalId,
      call_note_id: null,
      incoming_message_id: null,
      contact_id: null,
      action_type: "notify_delay_email",
      status: "pending_approval",
      title: copy.actionEmergencyTitle,
      rationale: copy.actionEmergencyRationale,
      draft_payload: {
        demo: true,
        proposalId,
        body: proposal.messageBody,
      },
      external_payload: {},
      risk_level: "high",
      requires_approval: true,
      approved_by: null,
      approved_at: null,
      execution_status: "dry_run",
      executed_at: null,
      failed_reason: null,
      expires_at: addDays(now, 1).toISOString(),
      created_by_ai: true,
      created_at: emergencyAction.createdAt,
      updated_at: updatedAt,
    },
    {
      id: actionCallId,
      organization_id: organizationId,
      appointment_request_id: appointmentRequestCallId,
      emergency_action_id: null,
      reschedule_proposal_id: null,
      call_note_id: quickCallId,
      incoming_message_id: null,
      contact_id: null,
      action_type: "callback_reminder",
      status: "pending_approval",
      title: copy.actionCallTitle,
      rationale: copy.actionCallRationale,
      draft_payload: {
        demo: true,
        customerName: "Andrea Riva",
        phone: "+393339998888",
        startsAt: quickCallNote.requestedStartsAt,
      },
      external_payload: {},
      risk_level: "low",
      requires_approval: true,
      approved_by: null,
      approved_at: null,
      execution_status: "dry_run",
      executed_at: null,
      failed_reason: null,
      expires_at: addDays(now, 3).toISOString(),
      created_by_ai: true,
      created_at: quickCallNote.createdAt,
      updated_at: updatedAt,
    },
  ];

  const dailySummary: DailySummary = {
    id: demoUuid("701"),
    organizationId,
    summaryDate: today,
    timezone: "Europe/Rome",
    status: "generated",
    title: copy.dailySummaryTitle,
    headline: copy.dailySummaryHeadline,
    totalAppointments: calendarEvents.length,
    firstAppointmentAt: calendarEvents[0].startsAt,
    lastAppointmentAt: calendarEvents[2].endsAt,
    pendingApprovalsCount: suggestedActions.length,
    conflictsCount: 0,
    unhandledMessagesCount: 2,
    freeSlotsCount: 3,
    items: [
      {
        id: "demo-summary-calendar",
        type: "appointment",
        title: copy.summaryFirstAppointmentTitle,
        description: calendarEvents[0].title,
        startsAt: calendarEvents[0].startsAt,
        endsAt: calendarEvents[0].endsAt,
        priority: "normal",
        relatedEntityType: "calendar_event",
        relatedEntityId: calendarEvents[0].id,
        actionLabel: copy.reviewDay,
      },
      {
        id: "demo-summary-approval",
        type: "pending_approval",
        title: copy.summaryApprovalsTitle,
        description: copy.summaryApprovalsDescription,
        startsAt: null,
        endsAt: null,
        priority: "high",
        relatedEntityType: "suggested_action",
        relatedEntityId: actionEmailId,
        actionLabel: copy.openApprovals,
      },
      {
        id: "demo-summary-message",
        type: "unhandled_message",
        title: copy.summaryWhatsappTitle,
        description: copy.summaryWhatsappDescription,
        startsAt: null,
        endsAt: null,
        priority: "normal",
        relatedEntityType: "incoming_message",
        relatedEntityId: whatsappMessageId,
        actionLabel: copy.reviewDraft,
      },
    ],
    recommendations: [
      {
        id: "demo-summary-recommendation",
        type: "recommendation",
        title: copy.summaryRecommendationTitle,
        description: copy.summaryRecommendationDescription,
        startsAt: null,
        endsAt: null,
        priority: "normal",
        relatedEntityType: null,
        relatedEntityId: null,
        actionLabel: null,
      },
    ],
    generatedAt: addMinutes(now, -7).toISOString(),
    viewedAt: null,
    createdAt,
    updatedAt,
  };

  const quickCallResult: QuickCallResult = {
    callNote: quickCallNote,
    appointmentRequest: appointmentRequests[2],
    suggestedActions: [suggestedActions[3]],
    warnings: [copy.quickCallWarning],
    alternatives: [
      {
        startsAt: quickCallNote.requestedStartsAt ?? atLocal(dateKey(dayAfterTomorrow), 10, 0).toISOString(),
        endsAt: quickCallNote.requestedEndsAt ?? atLocal(dateKey(dayAfterTomorrow), 10, 15).toISOString(),
        durationMinutes: 15,
        provider: "all",
        calendarAccountId: null,
      },
    ],
  };

  return {
    isDemo: true,
    organization: {
      id: organizationId,
      name: copy.organizationName,
      slug: "demo-local",
      default_timezone: "Europe/Rome",
      settings: demoMeta("organization"),
      created_at: createdAt,
      updated_at: updatedAt,
    },
    membership: {
      id: demoUuid("3"),
      organization_id: organizationId,
      user_id: userId,
      role: "owner",
      invited_email: null,
      joined_at: createdAt,
      created_at: createdAt,
      updated_at: updatedAt,
    },
    calendarStatuses: [
      {
        provider: "google",
        connected: true,
        email: "demo.calendar@example.test",
        status: "active",
        lastSyncedAt: addMinutes(now, -9).toISOString(),
        lastSyncStatus: "success",
        lastSyncError: null,
      },
      {
        provider: "microsoft",
        connected: false,
        email: null,
        status: "not_connected",
        lastSyncedAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
      },
    ],
    calendarEvents,
    emailStatuses: [
      {
        provider: "gmail",
        connected: true,
        email: "demo.inbox@example.test",
        status: "active",
        lastSyncedAt: addMinutes(now, -11).toISOString(),
        lastSyncStatus: "success",
        lastSyncError: null,
      },
      {
        provider: "microsoft",
        connected: false,
        email: null,
        status: "not_connected",
        lastSyncedAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
      },
    ],
    emailMessages,
    whatsappStatus: {
      provider: "whatsapp_business_cloud",
      connected: true,
      displayPhoneNumber: "+39 333 000 0000",
      status: "active",
      lastSyncedAt: addMinutes(now, -6).toISOString(),
      lastSyncStatus: "success",
      lastSyncError: null,
    },
    whatsappMessages,
    appointmentRequests,
    suggestedActions,
    dailySummarySettings: {
      organizationId,
      enabled: true,
      deliveryTime: "08:00",
      timezone: "Europe/Rome",
      includeCalendar: true,
      includePendingApprovals: true,
      includeUnhandledMessages: true,
      includeFreeSlots: true,
      createdAt,
      updatedAt,
    },
    dailySummary,
    emergencyActions: [emergencyAction],
    emergencyResult: {
      emergencyAction,
      affectedEvents: [calendarEvents[1]],
      proposals: [proposal],
      suggestedActions: [suggestedActions[2]],
      warnings: [copy.emergencyWarning],
    },
    quickCallNotes: [quickCallNote],
    quickCallResult,
    syncLogs: [
      {
        id: demoUuid("801"),
        organizationId,
        provider: "google_calendar",
        jobType: "calendar_sync",
        status: "success",
        startedAt: addMinutes(now, -12).toISOString(),
        finishedAt: addMinutes(now, -11).toISOString(),
        recordsRead: 12,
        recordsCreated: 1,
        recordsUpdated: 2,
        recordsSkipped: 9,
        errorMessage: null,
        metadata: demoMeta("sync_calendar"),
        createdAt: addMinutes(now, -12).toISOString(),
      },
      {
        id: demoUuid("802"),
        organizationId,
        provider: "gmail",
        jobType: "email_sync",
        status: "success",
        startedAt: addMinutes(now, -14).toISOString(),
        finishedAt: addMinutes(now, -13).toISOString(),
        recordsRead: 8,
        recordsCreated: 1,
        recordsUpdated: 0,
        recordsSkipped: 7,
        errorMessage: null,
        metadata: demoMeta("sync_email"),
        createdAt: addMinutes(now, -14).toISOString(),
      },
      {
        id: demoUuid("803"),
        organizationId,
        provider: "whatsapp",
        jobType: "whatsapp_webhook",
        status: "partial_success",
        startedAt: addMinutes(now, -30).toISOString(),
        finishedAt: addMinutes(now, -29).toISOString(),
        recordsRead: 2,
        recordsCreated: 1,
        recordsUpdated: 0,
        recordsSkipped: 1,
        errorMessage: copy.syncDuplicateWarning,
        metadata: demoMeta("sync_whatsapp"),
        createdAt: addMinutes(now, -30).toISOString(),
      },
    ],
    notificationPreferences: {
      id: demoUuid("901"),
      organizationId,
      userId,
      watchFriendlyNotificationsEnabled: true,
      allowQuickApproveFromWatch: true,
      allowQuickIgnoreFromWatch: true,
      showDailySummaryOnWatch: true,
      emergencyShortcutsOnWatch: true,
      createdAt,
      updatedAt,
    },
    registeredDevices: [
      {
        id: demoUuid("902"),
        organizationId,
        userId,
        deviceType: "mobile",
        platform: "unknown",
        deviceName: copy.mobileDeviceName,
        pushToken: "demo-expo-push-token",
        capabilities: [
          "push_notifications",
          "actionable_notifications",
          "open_mobile_deeplink",
          "daily_summary_glance",
        ],
        status: "active",
        lastSeenAt: addMinutes(now, -5).toISOString(),
        createdAt,
        updatedAt,
      },
      {
        id: demoUuid("903"),
        organizationId,
        userId,
        deviceType: "smartwatch",
        platform: "apple_watch",
        deviceName: copy.watchDeviceName,
        pushToken: "demo-watch-forwarded-token",
        capabilities: [
          "actionable_notifications",
          "quick_approve",
          "quick_ignore",
          "daily_summary_glance",
          "emergency_shortcuts",
          "open_mobile_deeplink",
        ],
        status: "active",
        lastSeenAt: addMinutes(now, -5).toISOString(),
        createdAt,
        updatedAt,
      },
    ],
    notificationStatus: {
      expoConfigured: false,
      pushEnabled: false,
      registeredDevices: 2,
      lastDeliveryStatus: "demo_ready",
      message: copy.notificationStatus,
    },
  };
}

function demoUuid(suffix: string): Uuid {
  return `00000000-0000-4000-8000-${suffix.padStart(12, "0")}` as Uuid;
}

function demoMeta(source: string): Json {
  return {
    demo: true,
    source,
    safety: SOREYA_DEMO_COPY,
  };
}

const demoCopy = {
  it: {
    safety: SOREYA_DEMO_COPY,
    organizationName: "[DEMO] Workspace locale Soreya",
    calendarDentistTitle: "[DEMO] Studio Verdi - controllo annuale",
    calendarDentistDescription: "Evento demo generato localmente per verificare Soreya.",
    calendarReviewTitle: "[DEMO] Revisione progetto con Laura",
    calendarReviewDescription: "Definizione prossimi passi e coda approvazioni.",
    calendarQuoteTitle: "[DEMO] Sopralluogo preventivo",
    calendarQuoteDescription: "Richiesto dal messaggio WhatsApp demo.",
    customerLocation: "Cliente - Torino",
    customerLocationShort: "Cliente",
    emailSubject: "[DEMO] Spostiamo il briefing?",
    emailSnippet: "Possiamo spostare il briefing a domani mattina verso le 11?",
    emailBody: "Ciao, possiamo spostare il briefing a domani mattina verso le 11? Va bene anche una call breve.",
    whatsappBody: "[DEMO] Buongiorno, riuscite a fare un sopralluogo domani pomeriggio?",
    quickCallRawText:
      "[DEMO] Telefonata con Mario Rossi: chiede richiamata venerdi alle 10 per confermare appuntamento e preventivo.",
    quickCallRequestedTime: "venerdi alle 10",
    quickCallReason: "Conferma richiamata e preventivo",
    appointmentEmailTitle: "[DEMO] Briefing con Marta",
    appointmentWhatsappTitle: "[DEMO] Sopralluogo Giulia",
    appointmentCallTitle: "[DEMO] Richiamata Mario Rossi",
    videoCall: "Videochiamata",
    phone: "Telefono",
    emergencyReason: "[DEMO] Sono in ritardo di 20 minuti",
    emergencyProposalBody:
      "[DEMO] Ciao Laura, potrei arrivare con circa 20 minuti di ritardo. Ti confermo qui prima di qualsiasi invio reale.",
    actionEmailTitle: "[DEMO] Rispondi a Marta e blocca le 11:00",
    actionEmailRationale: "La richiesta e chiara e non sono stati rilevati conflitti calendario.",
    actionEmailSubject: "Re: Spostiamo il briefing?",
    actionEmailBody:
      "Ciao Marta, domani alle 11:00 va bene. Ti mando conferma finale dopo la mia approvazione in Soreya.",
    actionWhatsappTitle: "[DEMO] Rispondi a Giulia su WhatsApp",
    actionWhatsappRationale: "Soreya ha preparato una bozza breve, ma in demo non puo inviare.",
    actionWhatsappBody:
      "Buongiorno Giulia, domani pomeriggio alle 16:30 puo andare. Confermo appena approvato in Soreya.",
    actionEmergencyTitle: "[DEMO] Avvisa Laura del ritardo",
    actionEmergencyRationale: "La modalita emergenza puo solo preparare una pending approval in demo.",
    actionCallTitle: "[DEMO] Prepara promemoria richiamata Mario",
    actionCallRationale: "La nota chiamata contiene dettagli sufficienti per preparare un promemoria.",
    dailySummaryTitle: "[DEMO] Riepilogo giornaliero",
    dailySummaryHeadline: "3 appuntamenti, 4 approvazioni in attesa e 2 nuovi messaggi da rivedere.",
    summaryFirstAppointmentTitle: "[DEMO] Primo appuntamento alle 09:30",
    reviewDay: "Rivedi giornata",
    summaryApprovalsTitle: "[DEMO] 4 approvazioni richiedono una decisione",
    summaryApprovalsDescription: "Sono tutte bozze e restano bloccate dall'esecuzione.",
    openApprovals: "Apri approvazioni",
    summaryWhatsappTitle: "[DEMO] Richiesta appuntamento WhatsApp",
    summaryWhatsappDescription: "Giulia chiede un sopralluogo domani pomeriggio.",
    reviewDraft: "Rivedi bozza",
    summaryRecommendationTitle: "[DEMO] Approva solo dopo aver verificato i dettagli cliente",
    summaryRecommendationDescription: "Le azioni demo sono anteprime sicure e non contattano provider.",
    quickCallWarning: "Modalita demo: nessun promemoria calendario o messaggio esterno verra creato.",
    emergencyWarning: "Modalita demo: smartwatch e mobile preparano solo approvazioni.",
    syncDuplicateWarning: "Payload webhook demo: un duplicato e stato saltato.",
    mobileDeviceName: "[DEMO] iPhone simulatore locale",
    watchDeviceName: "[DEMO] Apple Watch via notifiche telefono",
    notificationStatus:
      "Stato notifiche demo. Nessuna chiamata Expo push viene effettuata finche credenziali e flag reali non sono configurati.",
  },
  en: {
    safety: SOREYA_DEMO_COPY_EN,
    organizationName: "[DEMO] Soreya Local Workspace",
    calendarDentistTitle: "[DEMO] Studio Verdi - annual checkup",
    calendarDentistDescription: "Demo event generated locally to verify Soreya.",
    calendarReviewTitle: "[DEMO] Project review with Laura",
    calendarReviewDescription: "Discuss next steps and the approval queue.",
    calendarQuoteTitle: "[DEMO] Quote site visit",
    calendarQuoteDescription: "Requested by the demo WhatsApp message.",
    customerLocation: "Customer - Turin",
    customerLocationShort: "Customer",
    emailSubject: "[DEMO] Can we move the briefing?",
    emailSnippet: "Can we move the briefing to tomorrow morning around 11?",
    emailBody: "Hi, can we move the briefing to tomorrow morning around 11? A short call also works.",
    whatsappBody: "[DEMO] Good morning, can you do a site visit tomorrow afternoon?",
    quickCallRawText:
      "[DEMO] Call with Mario Rossi: he asks for a callback Friday at 10 to confirm the appointment and quote.",
    quickCallRequestedTime: "Friday at 10",
    quickCallReason: "Callback and quote confirmation",
    appointmentEmailTitle: "[DEMO] Briefing with Marta",
    appointmentWhatsappTitle: "[DEMO] Site visit for Giulia",
    appointmentCallTitle: "[DEMO] Callback for Mario Rossi",
    videoCall: "Video call",
    phone: "Phone",
    emergencyReason: "[DEMO] I am running 20 minutes late",
    emergencyProposalBody:
      "[DEMO] Hi Laura, I may be about 20 minutes late. I will confirm here before any real message is sent.",
    actionEmailTitle: "[DEMO] Reply to Marta and hold 11:00",
    actionEmailRationale: "The request is clear and no calendar conflict was detected.",
    actionEmailSubject: "Re: Can we move the briefing?",
    actionEmailBody:
      "Hi Marta, tomorrow at 11:00 works. I will send final confirmation after approving it in Soreya.",
    actionWhatsappTitle: "[DEMO] Reply to Giulia on WhatsApp",
    actionWhatsappRationale: "Soreya prepared a short draft, but demo mode cannot send it.",
    actionWhatsappBody:
      "Good morning Giulia, tomorrow afternoon at 16:30 works. I will confirm after approval in Soreya.",
    actionEmergencyTitle: "[DEMO] Notify Laura about the delay",
    actionEmergencyRationale: "Emergency Mode can only prepare a pending approval in demo.",
    actionCallTitle: "[DEMO] Prepare Mario callback reminder",
    actionCallRationale: "The call note has enough detail to prepare a reminder.",
    dailySummaryTitle: "[DEMO] Daily Summary",
    dailySummaryHeadline: "3 appointments, 4 approvals waiting, and 2 new messages need review.",
    summaryFirstAppointmentTitle: "[DEMO] First appointment at 09:30",
    reviewDay: "Review day",
    summaryApprovalsTitle: "[DEMO] 4 approvals need a decision",
    summaryApprovalsDescription: "All are drafts and remain blocked from execution.",
    openApprovals: "Open approvals",
    summaryWhatsappTitle: "[DEMO] WhatsApp appointment request",
    summaryWhatsappDescription: "Giulia asked for a site visit tomorrow afternoon.",
    reviewDraft: "Review draft",
    summaryRecommendationTitle: "[DEMO] Approve only after checking customer details",
    summaryRecommendationDescription: "Demo actions are safe previews and never contact providers.",
    quickCallWarning: "Demo mode: no calendar reminder or external message will be created.",
    emergencyWarning: "Demo mode: smartwatch and mobile emergency shortcuts only prepare approvals.",
    syncDuplicateWarning: "Demo webhook payload skipped one duplicate.",
    mobileDeviceName: "[DEMO] iPhone local simulator",
    watchDeviceName: "[DEMO] Apple Watch via phone notifications",
    notificationStatus:
      "Demo notification status. No Expo push call is made until real credentials and push flags are configured.",
  },
} as const satisfies Record<SupportedLocale, Record<string, string>>;

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60_000);
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function atLocal(day: string, hour: number, minute: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, hour, minute, 0, 0);
}
