import {
  createAuditLog,
  createExecutionRecord,
  getExecutableSuggestedAction,
  getExecutionRecords,
  getSuggestedActionById,
  markSuggestedActionExecuted,
  markSuggestedActionFailed,
  updateExecutionRecordStatus,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type {
  ExecutionPreview,
  ExecutionRecord,
  ExecutionStatus,
  ExecutionType,
  Json,
  SuggestedAction,
  SuggestedActionType,
} from "@soreya/shared";

import { sendGmailReply } from "@/lib/server/email-execution";
import { createGoogleCalendarEvent, parseCalendarEventDraftFromAction } from "@/lib/server/calendar-execution";
import { sendWhatsAppTextMessage } from "@/lib/server/whatsapp-execution";
import { sendTelegramTextMessage } from "@/lib/server/telegram-execution";

export type ExecuteSuggestedActionInput = {
  organizationId: string;
  suggestedActionId: string;
  userId: string;
  finalConfirmationText: string;
};

export type ExecutionResult = {
  action: SuggestedAction;
  preview: ExecutionPreview;
  record: ExecutionRecord;
  status: ExecutionStatus;
  dryRun: boolean;
  message: string;
};

type AdapterResult = {
  status: Extract<ExecutionStatus, "executed" | "failed" | "blocked">;
  responsePayload: Json;
  errorMessage?: string | null;
};

export function buildExecutionPreview(action: SuggestedAction): ExecutionPreview {
  const draft = toJsonObject(action.draft_payload);
  const executionType = getExecutionType(action.action_type);
  const provider = readProvider(action, draft);
  const recipient = readRecipient(draft);
  const subject = readString(draft, "subject");
  const body = readString(draft, "body") ?? readString(draft, "messageBody");
  const dryRun = isExecutionDryRun();
  const warnings: string[] = [];

  if (action.status !== "approved") {
    warnings.push("Only approved suggested_actions can be executed.");
  }

  if (["email_reply", "emergency_email"].includes(executionType) && !recipient) {
    warnings.push("Email execution needs a recipient before a provider call can be attempted.");
  }

  if (["whatsapp_reply", "emergency_whatsapp"].includes(executionType) && !recipient) {
    warnings.push("WhatsApp execution needs a recipient phone number before a provider call can be attempted.");
  }

  if (executionType === "telegram_reply" && !recipient) {
    warnings.push("Telegram execution needs a recipient chat id before a provider call can be attempted.");
  }

  if (dryRun) {
    warnings.push("Dry run enabled: no external action will be performed.");
  } else if (!isProviderExecutionEnabled(executionType)) {
    warnings.push(`${getProviderLabel(executionType)} execution is disabled by env flag.`);
  } else if (["whatsapp_reply", "emergency_whatsapp"].includes(executionType)) {
    warnings.push("WhatsApp Cloud API will send the approved message after EXECUTE confirmation.");
  } else if (executionType === "telegram_reply") {
    warnings.push("Telegram Bot API will send the approved message after EXECUTE confirmation.");
  } else if (["email_reply", "emergency_email"].includes(executionType)) {
    warnings.push("Gmail API will send the approved reply after EXECUTE confirmation.");
  } else if (isCalendarExecution(executionType)) {
    warnings.push("Google Calendar API will apply the approved calendar change after EXECUTE confirmation.");
  } else {
    warnings.push(`${getProviderLabel(executionType)} real execution adapter is not enabled yet.`);
  }

  return {
    suggestedActionId: action.id,
    executionType,
    provider,
    recipient,
    subject,
    body,
    calendarChange: isCalendarExecution(executionType) ? action.draft_payload : null,
    warnings,
    dryRun,
    canExecute: action.status === "approved" && (dryRun || isProviderExecutionEnabled(executionType)),
  };
}

export async function executeSuggestedAction(
  supabase: SoreyaSupabaseClient,
  input: ExecuteSuggestedActionInput,
): Promise<ExecutionResult> {
  const existingAction = await getSuggestedActionById(supabase, input.organizationId, input.suggestedActionId);

  if (!existingAction) {
    throw new Error("Suggested action not found.");
  }

  const preview = buildExecutionPreview(existingAction);
  const duplicateRecord = await getBlockingExecutionRecord(supabase, input.organizationId, input.suggestedActionId);

  if (existingAction.status === "executed") {
    return blockDuplicateExecution(
      supabase,
      existingAction,
      preview,
      input,
      duplicateRecord,
      "Suggested action has already been executed.",
    );
  }

  if (duplicateRecord) {
    return blockDuplicateExecution(
      supabase,
      existingAction,
      preview,
      input,
      duplicateRecord,
      `Execution is already ${duplicateRecord.status} for this suggested action.`,
    );
  }

  if (existingAction.status !== "approved") {
    return blockExecution(supabase, existingAction, preview, input, "Only approved suggested_actions can be executed.");
  }

  if (input.finalConfirmationText !== "EXECUTE") {
    return blockExecution(supabase, existingAction, preview, input, "Final confirmation must be exactly EXECUTE.");
  }

  const action = await getExecutableSuggestedAction(supabase, input.organizationId, input.suggestedActionId);

  if (preview.dryRun) {
    const record = await createExecutionRecord(supabase, {
      organizationId: input.organizationId,
      suggestedActionId: action.id,
      userId: input.userId,
      executionType: preview.executionType,
      status: "dry_run",
      dryRun: true,
      provider: preview.provider,
      requestPayload: action.draft_payload,
      responsePayload: {
        dryRun: true,
        message: "Dry run enabled. No external email, WhatsApp message or calendar change was performed.",
        preview: preview as unknown as Json,
      },
      finalConfirmationText: input.finalConfirmationText,
    });

    return {
      action,
      preview,
      record,
      status: "dry_run",
      dryRun: true,
      message: "Dry run completed. No external action was performed.",
    };
  }

  if (!isProviderExecutionEnabled(preview.executionType)) {
    return blockExecution(
      supabase,
      action,
      preview,
      input,
      `${getProviderLabel(preview.executionType)} execution is disabled by env flag.`,
    );
  }

  const accountCheck = await checkProviderAccount(supabase, input.organizationId, preview);

  if (!accountCheck.ready) {
    return blockExecution(supabase, action, preview, input, accountCheck.reason);
  }

  const record = await createExecutionRecord(supabase, {
    organizationId: input.organizationId,
    suggestedActionId: action.id,
    userId: input.userId,
    executionType: preview.executionType,
    status: "executing",
    dryRun: false,
    provider: preview.provider,
    requestPayload: action.draft_payload,
    finalConfirmationText: input.finalConfirmationText,
  });

  const adapterResult = await executeByType(supabase, input.organizationId, action, preview);
  const updatedRecord = await updateExecutionRecordStatus(supabase, {
    organizationId: input.organizationId,
    executionRecordId: record.id,
    userId: input.userId,
    status: adapterResult.status,
    responsePayload: adapterResult.responsePayload,
    errorMessage: adapterResult.errorMessage ?? null,
    executedAt: adapterResult.status === "executed" ? new Date().toISOString() : null,
  });

  if (adapterResult.status === "executed") {
    const updatedAction = await markSuggestedActionExecuted(supabase, {
      organizationId: input.organizationId,
      suggestedActionId: action.id,
      userId: input.userId,
    });

    return {
      action: updatedAction,
      preview,
      record: updatedRecord,
      status: "executed",
      dryRun: false,
      message: "Execution completed by provider adapter.",
    };
  }

  if (adapterResult.status === "failed") {
    const failedAction = await markSuggestedActionFailed(supabase, {
      organizationId: input.organizationId,
      suggestedActionId: action.id,
      userId: input.userId,
      errorMessage: adapterResult.errorMessage ?? "Execution failed.",
    });

    return {
      action: failedAction,
      preview,
      record: updatedRecord,
      status: "failed",
      dryRun: false,
      message: adapterResult.errorMessage ?? "Execution failed.",
    };
  }

  return {
    action,
    preview,
    record: updatedRecord,
    status: "blocked",
    dryRun: false,
    message: adapterResult.errorMessage ?? "Execution blocked by safe provider adapter.",
  };
}

export async function executeEmailAction(input: {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  preview: ExecutionPreview;
  action: SuggestedAction;
}): Promise<AdapterResult> {
  const draft = toJsonObject(input.action.draft_payload);
  const provider = readString(draft, "provider");
  const recipient = input.preview.recipient;
  const subject = input.preview.subject;
  const body = input.preview.body;

  if (provider && provider !== "gmail") {
    return {
      status: "blocked",
      responsePayload: {
        providerCall: "email",
        executed: false,
        reason: "Only Gmail send is enabled in this phase.",
      },
      errorMessage: "Microsoft mail send is not enabled yet. Google-only phase.",
    };
  }

  if (!recipient || !subject || !body) {
    return {
      status: "blocked",
      responsePayload: {
        providerCall: "email",
        executed: false,
        reason: "Email execution needs recipient, subject and body.",
      },
      errorMessage: "Email execution is missing recipient, subject or body.",
    };
  }

  try {
    const result = await sendGmailReply({
      supabase: input.supabase,
      organizationId: input.organizationId,
      recipient,
      subject,
      body,
      inReplyToMessageId: readString(draft, "messageId"),
      threadId: readString(draft, "threadId"),
    });

    return {
      status: "executed",
      responsePayload: {
        providerCall: "gmail",
        executed: true,
        providerMessageId: result.providerMessageId,
        threadId: result.threadId,
        response: result.response,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email execution failed.";

    return {
      status: "failed",
      responsePayload: {
        providerCall: "gmail",
        executed: false,
        reason: message,
      },
      errorMessage: message,
    };
  }
}

export async function executeWhatsAppAction(input: {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  preview: ExecutionPreview;
}): Promise<AdapterResult> {
  const recipient = input.preview.recipient;
  const body = input.preview.body;

  if (!recipient || !body) {
    return {
      status: "blocked",
      responsePayload: {
        providerCall: "whatsapp",
        executed: false,
        reason: "WhatsApp execution needs recipient and message body.",
      },
      errorMessage: "WhatsApp execution is missing recipient or body.",
    };
  }

  try {
    const result = await sendWhatsAppTextMessage({
      supabase: input.supabase,
      organizationId: input.organizationId,
      recipientPhone: recipient,
      body,
    });

    return {
      status: "executed",
      responsePayload: {
        providerCall: "whatsapp",
        executed: true,
        providerMessageId: result.providerMessageId,
        response: result.response,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp execution failed.";

    return {
      status: "failed",
      responsePayload: {
        providerCall: "whatsapp",
        executed: false,
        reason: message,
      },
      errorMessage: message,
    };
  }
}

export async function executeTelegramAction(input: {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  preview: ExecutionPreview;
}): Promise<AdapterResult> {
  const recipient = input.preview.recipient;
  const body = input.preview.body;

  if (!recipient || !body) {
    return {
      status: "blocked",
      responsePayload: {
        providerCall: "telegram",
        executed: false,
        reason: "Telegram execution needs recipient chat id and message body.",
      },
      errorMessage: "Telegram execution is missing recipient or body.",
    };
  }

  try {
    const result = await sendTelegramTextMessage({
      supabase: input.supabase,
      organizationId: input.organizationId,
      recipientChatId: recipient,
      body,
    });

    return {
      status: "executed",
      responsePayload: {
        providerCall: "telegram",
        executed: true,
        providerMessageId: result.providerMessageId,
        response: result.response,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram execution failed.";

    return {
      status: "failed",
      responsePayload: {
        providerCall: "telegram",
        executed: false,
        reason: message,
      },
      errorMessage: message,
    };
  }
}

export async function executeCalendarAction(input: {
  supabase: SoreyaSupabaseClient;
  organizationId: string;
  preview: ExecutionPreview;
  action: SuggestedAction;
}): Promise<AdapterResult> {
  const draft = toJsonObject(input.action.draft_payload);
  const provider = readString(draft, "provider");

  if (provider && provider !== "google") {
    return {
      status: "blocked",
      responsePayload: {
        providerCall: "calendar",
        executed: false,
        reason: "Only Google Calendar write is enabled in this phase.",
      },
      errorMessage: "Microsoft calendar write is not enabled yet. Google-only phase.",
    };
  }

  if (input.preview.executionType !== "calendar_create") {
    return {
      status: "blocked",
      responsePayload: {
        providerCall: "calendar",
        executed: false,
        reason: `Calendar execution type ${input.preview.executionType} is not implemented yet.`,
      },
      errorMessage: "Only calendar event creation is enabled in this phase.",
    };
  }

  const event = parseCalendarEventDraftFromAction(draft);

  if (!event) {
    return {
      status: "blocked",
      responsePayload: {
        providerCall: "calendar",
        executed: false,
        reason: "Calendar execution needs title, startsAt and endsAt.",
      },
      errorMessage: "Calendar execution is missing title or time window.",
    };
  }

  try {
    const result = await createGoogleCalendarEvent({
      supabase: input.supabase,
      organizationId: input.organizationId,
      event,
    });

    return {
      status: "executed",
      responsePayload: {
        providerCall: "google_calendar",
        executed: true,
        providerEventId: result.providerEventId,
        htmlLink: result.htmlLink,
        response: result.response,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar execution failed.";

    return {
      status: "failed",
      responsePayload: {
        providerCall: "google_calendar",
        executed: false,
        reason: message,
      },
      errorMessage: message,
    };
  }
}

async function blockExecution(
  supabase: SoreyaSupabaseClient,
  action: SuggestedAction,
  preview: ExecutionPreview,
  input: ExecuteSuggestedActionInput,
  reason: string,
): Promise<ExecutionResult> {
  const record = await createExecutionRecord(supabase, {
    organizationId: input.organizationId,
    suggestedActionId: action.id,
    userId: input.userId,
    executionType: preview.executionType,
    status: "blocked",
    dryRun: preview.dryRun,
    provider: preview.provider,
    requestPayload: action.draft_payload,
    responsePayload: {
      blocked: true,
      reason,
      preview: preview as unknown as Json,
    },
    errorMessage: reason,
    finalConfirmationText: input.finalConfirmationText || null,
  });

  return {
    action,
    preview: {
      ...preview,
      canExecute: false,
      warnings: [...preview.warnings, reason],
    },
    record,
    status: "blocked",
    dryRun: preview.dryRun,
    message: reason,
  };
}

async function getBlockingExecutionRecord(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
  suggestedActionId: string,
): Promise<ExecutionRecord | null> {
  const records = await getExecutionRecords(supabase, organizationId, {
    suggestedActionId,
    statuses: ["executing", "executed"],
    limit: 1,
  });

  return records[0] ?? null;
}

async function blockDuplicateExecution(
  supabase: SoreyaSupabaseClient,
  action: SuggestedAction,
  preview: ExecutionPreview,
  input: ExecuteSuggestedActionInput,
  existingRecord: ExecutionRecord | null,
  reason: string,
): Promise<ExecutionResult> {
  await createAuditLog(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventName: "execution_duplicate_blocked",
    entityTable: "suggested_actions",
    entityId: action.id,
    metadata: {
      suggestedActionId: action.id,
      existingExecutionRecordId: existingRecord?.id ?? null,
      existingExecutionStatus: existingRecord?.status ?? null,
      actionStatus: action.status,
      reason,
    },
  });

  if (existingRecord) {
    return {
      action,
      preview: {
        ...preview,
        canExecute: false,
        warnings: [...preview.warnings, reason],
      },
      record: existingRecord,
      status: "blocked",
      dryRun: preview.dryRun,
      message: reason,
    };
  }

  return blockExecution(supabase, action, preview, input, reason);
}

async function executeByType(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
  action: SuggestedAction,
  preview: ExecutionPreview,
): Promise<AdapterResult> {
  if (["email_reply", "emergency_email"].includes(preview.executionType)) {
    return executeEmailAction({ supabase, organizationId, preview, action });
  }

  if (["whatsapp_reply", "emergency_whatsapp"].includes(preview.executionType)) {
    return executeWhatsAppAction({ supabase, organizationId, preview });
  }

  if (preview.executionType === "telegram_reply") {
    return executeTelegramAction({ supabase, organizationId, preview });
  }

  if (isCalendarExecution(preview.executionType)) {
    return executeCalendarAction({ supabase, organizationId, preview, action });
  }

  return {
    status: "blocked",
    responsePayload: {
      actionType: action.action_type,
      executed: false,
      reason: "This execution type needs a dedicated adapter before real execution.",
    },
    errorMessage: "Execution adapter is not implemented for this action type.",
  };
}

async function checkProviderAccount(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
  preview: ExecutionPreview,
): Promise<{ ready: true } | { ready: false; reason: string }> {
  const providers = toConnectedAccountProviders(preview.executionType, preview.provider);

  if (providers.length === 0) {
    return { ready: false, reason: "No provider account mapping exists for this execution type." };
  }

  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, encrypted_access_token, encrypted_refresh_token, status")
    .eq("organization_id", organizationId)
    .in("provider", providers)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { ready: false, reason: "No active provider account is connected for this execution." };
  }

  if (!data.encrypted_access_token && !data.encrypted_refresh_token) {
    return { ready: false, reason: "Connected provider account has no stored token for execution." };
  }

  return { ready: true };
}

function getExecutionType(actionType: SuggestedActionType): ExecutionType {
  const typeMap: Partial<Record<SuggestedActionType, ExecutionType>> = {
    send_email: "email_reply",
    send_email_reply: "email_reply",
    create_email_draft: "email_reply",
    ask_email_more_info: "email_reply",
    send_call_followup_email: "email_reply",
    request_call_more_info: "email_reply",
    send_emergency_email: "emergency_email",
    notify_delay_email: "emergency_email",
    send_whatsapp: "whatsapp_reply",
    send_whatsapp_reply: "whatsapp_reply",
    ask_whatsapp_more_info: "whatsapp_reply",
    send_call_followup_whatsapp: "whatsapp_reply",
    send_telegram_reply: "telegram_reply",
    ask_telegram_more_info: "telegram_reply",
    send_emergency_whatsapp: "emergency_whatsapp",
    notify_delay_whatsapp: "emergency_whatsapp",
    create_calendar_event: "calendar_create",
    create_calendar_event_from_call: "calendar_create",
    update_calendar_event: "calendar_update",
    update_calendar_event_from_call: "calendar_update",
    propose_calendar_reschedule: "calendar_update",
    delete_calendar_event: "calendar_cancel",
    cancel_calendar_event: "calendar_cancel",
    cancel_calendar_event_from_call: "calendar_cancel",
    block_calendar_day: "calendar_block",
    callback_reminder: "callback_reminder",
  };

  return typeMap[actionType] ?? "callback_reminder";
}

function readProvider(action: SuggestedAction, draft: Record<string, Json | undefined>): string | null {
  const provider = readString(draft, "provider");

  if (provider) {
    return provider;
  }

  if (action.action_type.includes("whatsapp")) {
    return "whatsapp_business_cloud";
  }

  if (action.action_type.includes("telegram")) {
    return "telegram";
  }

  if (action.action_type.includes("email")) {
    return "email";
  }

  if (action.action_type.includes("calendar")) {
    return "calendar";
  }

  return null;
}

function readRecipient(draft: Record<string, Json | undefined>): string | null {
  return (
    readString(draft, "recipient") ??
    readString(draft, "recipientEmail") ??
    readString(draft, "recipientPhone") ??
    readString(draft, "recipientChatId") ??
    readString(draft, "customerEmail") ??
    readString(draft, "customerPhone")
  );
}

function isExecutionDryRun(): boolean {
  return process.env.EXECUTION_DRY_RUN !== "false";
}

function isProviderExecutionEnabled(executionType: ExecutionType): boolean {
  if (["email_reply", "emergency_email"].includes(executionType)) {
    return process.env.ENABLE_EMAIL_EXECUTION === "true";
  }

  if (["whatsapp_reply", "emergency_whatsapp"].includes(executionType)) {
    return process.env.ENABLE_WHATSAPP_EXECUTION === "true";
  }

  if (executionType === "telegram_reply") {
    return process.env.ENABLE_TELEGRAM_EXECUTION === "true";
  }

  if (isCalendarExecution(executionType)) {
    return process.env.ENABLE_CALENDAR_EXECUTION === "true";
  }

  return false;
}

function getProviderLabel(executionType: ExecutionType): string {
  if (["email_reply", "emergency_email"].includes(executionType)) {
    return "Email";
  }

  if (["whatsapp_reply", "emergency_whatsapp"].includes(executionType)) {
    return "WhatsApp";
  }

  if (executionType === "telegram_reply") {
    return "Telegram";
  }

  if (isCalendarExecution(executionType)) {
    return "Calendar";
  }

  return "Provider";
}

function toConnectedAccountProviders(executionType: ExecutionType, provider: string | null) {
  if (["email_reply", "emergency_email"].includes(executionType)) {
    if (provider === "microsoft") {
      return ["microsoft_mail"] as const;
    }

    if (provider === "gmail") {
      return ["gmail"] as const;
    }

    return ["gmail", "microsoft_mail"] as const;
  }

  if (["whatsapp_reply", "emergency_whatsapp"].includes(executionType)) {
    return ["whatsapp_business_cloud"] as const;
  }

  if (executionType === "telegram_reply") {
    return ["telegram"] as const;
  }

  if (isCalendarExecution(executionType)) {
    if (provider === "microsoft") {
      return ["microsoft_calendar"] as const;
    }

    if (provider === "google") {
      return ["google_calendar"] as const;
    }

    return ["google_calendar", "microsoft_calendar"] as const;
  }

  return [] as const;
}

function isCalendarExecution(executionType: ExecutionType): boolean {
  return ["calendar_create", "calendar_update", "calendar_cancel", "calendar_block"].includes(executionType);
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readString(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
