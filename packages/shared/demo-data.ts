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

export const SOREYA_DEMO_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
export const SOREYA_DEMO_USER_ID = "00000000-0000-4000-8000-000000000002";
export const SOREYA_DEMO_COPY =
  "Demo data only. No providers are called and no action is executed.";

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

export function getSoreyaDemoData(now = new Date()): SoreyaDemoData {
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
      title: "[DEMO] Studio dentistico - controllo annuale",
      description: "Demo event generated locally for Soreya readiness.",
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
      title: "[DEMO] Review progetto con Laura",
      description: "Discuss next steps and approval queue.",
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
      title: "[DEMO] Sopralluogo preventivo",
      description: "Requested by incoming WhatsApp demo message.",
      location: "Cliente - Torino",
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
      subject: "[DEMO] Spostiamo il briefing?",
      snippet: "Possiamo spostare il briefing a domani mattina verso le 11?",
      bodyText:
        "Ciao, possiamo spostare il briefing a domani mattina verso le 11? Va bene anche una call breve.",
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
      textBody: "[DEMO] Buongiorno, riuscite a fare un sopralluogo domani pomeriggio?",
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
    rawText:
      "[DEMO] Telefonata con Andrea: chiede richiamata venerdi alle 10 per confermare appuntamento in showroom.",
    status: "pending_approval",
    intentType: "callback_request",
    confidence: 0.88,
    customerName: "Andrea Riva",
    customerEmail: "andrea.riva@example.test",
    customerPhone: "+393339998888",
    requestedDateTimeText: "venerdi alle 10",
    requestedStartsAt: atLocal(dateKey(dayAfterTomorrow), 10, 0).toISOString(),
    requestedEndsAt: atLocal(dateKey(dayAfterTomorrow), 10, 15).toISOString(),
    reason: "Callback confirmation",
    extractedConstraints: demoMeta("quick_call_constraints"),
    analysis: {
      demo: true,
      source: "quick_call_analysis",
      safety: SOREYA_DEMO_COPY,
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
      title: "[DEMO] Briefing con Marta",
      requested_start: atLocal(tomorrowKey, 11, 0).toISOString(),
      requested_end: atLocal(tomorrowKey, 11, 30).toISOString(),
      requested_timezone: "Europe/Rome",
      duration_minutes: 30,
      location: "Video call",
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
      title: "[DEMO] Sopralluogo Giulia",
      requested_start: atLocal(tomorrowKey, 16, 30).toISOString(),
      requested_end: atLocal(tomorrowKey, 17, 15).toISOString(),
      requested_timezone: "Europe/Rome",
      duration_minutes: 45,
      location: "Cliente",
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
      title: "[DEMO] Callback Andrea Riva",
      requested_start: quickCallNote.requestedStartsAt,
      requested_end: quickCallNote.requestedEndsAt,
      requested_timezone: "Europe/Rome",
      duration_minutes: 15,
      location: "Phone",
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
    reason: "[DEMO] Sono in ritardo di 20 minuti",
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
    messageBody:
      "[DEMO] Ciao Laura, potrei arrivare con circa 20 minuti di ritardo. Ti confermo qui prima di qualsiasi invio reale.",
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
      title: "[DEMO] Reply to Marta and hold 11:00",
      rationale: "The request is clear and has no detected calendar conflict.",
      draft_payload: {
        demo: true,
        to: "marta.neri@example.test",
        subject: "Re: Spostiamo il briefing?",
        body: "Ciao Marta, domani alle 11:00 va bene. Ti mando conferma finale dopo la mia approvazione in Soreya.",
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
      title: "[DEMO] Reply to Giulia on WhatsApp",
      rationale: "Soreya prepared a short draft, but it cannot send from demo data.",
      draft_payload: {
        demo: true,
        to: "+393331234567",
        body: "Buongiorno Giulia, domani pomeriggio alle 16:30 puo andare. Confermo appena approvato in Soreya.",
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
      title: "[DEMO] Notify Laura about delay",
      rationale: "Emergency Mode can only prepare a pending approval in demo.",
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
      title: "[DEMO] Prepare Andrea callback reminder",
      rationale: "The call note has enough detail to prepare a reminder.",
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
    title: "[DEMO] Daily Summary",
    headline: "3 calendar items, 4 approvals waiting, and 2 new messages need review.",
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
        title: "[DEMO] First appointment at 09:30",
        description: calendarEvents[0].title,
        startsAt: calendarEvents[0].startsAt,
        endsAt: calendarEvents[0].endsAt,
        priority: "normal",
        relatedEntityType: "calendar_event",
        relatedEntityId: calendarEvents[0].id,
        actionLabel: "Review day",
      },
      {
        id: "demo-summary-approval",
        type: "pending_approval",
        title: "[DEMO] 4 approvals need a decision",
        description: "All are drafts and remain blocked from execution.",
        startsAt: null,
        endsAt: null,
        priority: "high",
        relatedEntityType: "suggested_action",
        relatedEntityId: actionEmailId,
        actionLabel: "Open approvals",
      },
      {
        id: "demo-summary-message",
        type: "unhandled_message",
        title: "[DEMO] WhatsApp appointment request",
        description: "Giulia asked for a site visit tomorrow afternoon.",
        startsAt: null,
        endsAt: null,
        priority: "normal",
        relatedEntityType: "incoming_message",
        relatedEntityId: whatsappMessageId,
        actionLabel: "Review draft",
      },
    ],
    recommendations: [
      {
        id: "demo-summary-recommendation",
        type: "recommendation",
        title: "[DEMO] Approve only after checking customer details",
        description: "Demo actions are safe previews and never contact providers.",
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
    warnings: ["Demo mode: no calendar reminder or external message will be created."],
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
      name: "[DEMO] Soreya Local Workspace",
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
      warnings: ["Demo mode: smartwatch and mobile emergency shortcuts only prepare approvals."],
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
        errorMessage: "Demo webhook payload skipped one duplicate.",
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
        deviceName: "[DEMO] iPhone local simulator",
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
        deviceName: "[DEMO] Apple Watch via phone notifications",
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
      message:
        "Demo notification status. No Expo push call is made until real credentials and push flags are configured.",
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
